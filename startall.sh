#!/usr/bin/env bash
#
# zyblox all-in-one dev launcher.
#
# Starts every service the stack needs:
#
#   website     services/Roblox/Roblox.Website      dotnet watch run   http://127.0.0.1:5000  (hot reload)
#   admin       services/admin                      webpack --watch    (writes services/admin/public)
#   frontend    services/2016-roblox-main           next dev           http://localhost:3185
#   gameserver  services/game-server                ts-node-dev        http://localhost:3190  ws :3189
#   validation  services/AssetValidationServiceV2   go run main.go     http://localhost:4300
#
# api/web are not started here (ran by these).
#
# Usage:
#   ./startall.sh                 # start everything
#   ./startall.sh website admin   # start a subset
#   ./startall.sh --status        # show what is listening
# Ctrl-C stops everything.

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT/.logs"

# name|color|dir|port|command
SERVICES=(
  "website|36|Roblox/Roblox.Website|5000|dotnet watch run"
  "validation|34|AssetValidationServiceV2|4300|go run main.go"
  "gameserver|35|game-server|3190|npm run dev"
  "admin|33|admin||npm run dev"
  "frontend|32|2016-roblox-main|3185|npm run dev"
)

mkdir -p "$LOG_DIR"

# ---------------------------------------------------------------- helpers ----

if [ -t 1 ]; then
  R=$'\033[0m'; S=$'\033[1m'
else
  R=''; S=''
fi

port_open() {
  (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
}

find_spec() { # name -> spec
  local s
  for s in "${SERVICES[@]}"; do
    [ "${s%%|*}" = "$1" ] && { echo "$s"; return 0; }
  done
  return 1
}

admin_watching() { # webpack has no port - check whose cwd is services/admin
  local p cwd
  for p in $(pgrep -f webpack 2>/dev/null); do
    cwd="$(readlink -f "/proc/$p/cwd" 2>/dev/null)"
    [ "$cwd" = "$ROOT/services/admin" ] && return 0
  done
  return 1
}

status_of() { # name -> status string
  local spec port
  spec="$(find_spec "$1")" || { echo "unknown"; return; }
  port="${spec#*|*|*|}"; port="${port%%|*}"
  if [ -n "$port" ] && port_open "$port"; then
    echo "${S}up${R} (:$port)"
  elif [ "$1" = admin ]; then
    if admin_watching; then
      echo "${S}watching${R} (no port)"
    else
      echo "${R}down${R}"
    fi
  else
    echo "${R}down${R}"
  fi
}

# ------------------------------------------------------------- preflight -----

missing=0
for tool in dotnet node npm go; do
  command -v "$tool" >/dev/null 2>&1 || { echo "${R}error:${R} '$tool' is not installed"; missing=1; }
done
[ "$missing" -eq 0 ] || exit 1

# Snap-packaged dotnet has its runtime inside the snap dir. If the apphost can't
# find a runtime (DOTNET_ROOT points nowhere / isn't set), point it at the snap.
if ! ls /usr/share/dotnet/shared/Microsoft.NETCore.App >/dev/null 2>&1 \
   && ! ls "${DOTNET_ROOT:-/nonexistent}"/shared/Microsoft.NETCore.App >/dev/null 2>&1; then
  for snap_dir in /snap/dotnet-sdk/current /var/lib/snapd/snap/dotnet-sdk/current; do
    if [ -d "$snap_dir/shared/Microsoft.NETCore.App" ]; then
      export DOTNET_ROOT="$snap_dir"
      break
    fi
  done
fi

if ! port_open 5432; then
  echo "${R}warning:${R} nothing is listening on :5432 - postgres is not running"
fi
if ! port_open 6379; then
  echo "${R}warning:${R} nothing is listening on :6379 - redis is not running"
fi

if [ "${1:-}" = "--status" ]; then
  for s in "${SERVICES[@]}"; do
    name="${s%%|*}"
    printf '  %-11s %b\n' "$name" "$(status_of "$name")"
  done
  exit 0
fi

# Which services to start (all by default).
declare -a SELECTED=()
if [ "$#" -gt 0 ]; then
  for name in "$@"; do
    if find_spec "$name" >/dev/null; then
      SELECTED+=("$name")
    else
      echo "${R}error:${R} unknown service '$name' (valid: $(printf '%s ' "${SERVICES[@]%%|*}"))"
      exit 1
    fi
  done
else
  for s in "${SERVICES[@]}"; do SELECTED+=("${s%%|*}"); done
fi

# Install deps if node_modules is missing.
for name in "${SELECTED[@]}"; do
  spec="$(find_spec "$name")"
  dir="$(echo "$spec" | cut -d'|' -f3)"
  cmd="$(echo "$spec" | cut -d'|' -f5)"
  if [[ "$cmd" == npm* ]] && [ ! -d "$ROOT/services/$dir/node_modules" ]; then
    echo "${S}$name${R}: node_modules missing, running npm i..."
    (cd "$ROOT/services/$dir" && npm i) || { echo "${R}error:${R} npm i failed in services/$dir"; exit 1; }
  fi
done

# ---------------------------------------------------------------- start ------

declare -a PID_NAME=()   # pid -> name
declare -a NAMES=()      # parallel list for display

start_service() { # name
  local spec dir cmd color name log pid
  name="$1"
  spec="$(find_spec "$name")"
  color="$(echo "$spec" | cut -d'|' -f2)"
  dir="$(echo "$spec" | cut -d'|' -f3)"
  cmd="$(echo "$spec" | cut -d'|' -f5)"
  log="$LOG_DIR/$name.log"
  : >"$log"

  # setsid gives each service its own process group so Ctrl-C / kill can take
  # down dotnet-watch's child app and webpack's workers with it.
  setsid bash -c "cd '$ROOT/services/$dir' && exec $cmd" >"$log" 2>&1 &
  pid=$!
  PID_NAME+=("$pid")
  NAMES+=("$name")

  # Prefix logger: one sed per service, reads the log tail-forever.
  tail -n +1 -F "$log" 2>/dev/null |
    sed -u "s/^/$(printf '\033[%sm' "$color")[$name]$(printf '%s' "$R") /" &
}

cleanup() {
  trap - INT TERM EXIT
  echo
  echo "stopping..."
  local pid name
  for pid in "${PID_NAME[@]:-}"; do
    [ -n "$pid" ] && kill -TERM -- "-$pid" 2>/dev/null
  done
  sleep 2
  for pid in "${PID_NAME[@]:-}"; do
    [ -n "$pid" ] && kill -KILL -- "-$pid" 2>/dev/null
  done
  wait 2>/dev/null
  echo "stopped."
}
trap cleanup INT TERM EXIT

echo "${S}zyblox dev stack${R} - logs in .logs/, Ctrl-C stops everything"
echo

for name in "${SELECTED[@]}"; do
  start_service "$name"
done

# Wait a moment, then report health.
sleep 6
echo
echo "${S}status:${R}"
for name in "${SELECTED[@]}"; do
  printf '  %-11s %b\n' "$name" "$(status_of "$name")"
done
echo

wait
