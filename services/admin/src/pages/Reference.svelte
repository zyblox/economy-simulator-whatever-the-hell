<script lang="ts">
	import Main from "../components/templates/Main.svelte";
	import type { AdminApiEndpoint } from "../lib/admin-api";
	import { endpoints, permissions } from "../lib/admin-api";
	import * as rank from "../stores/rank";

	const ANY = "";
	const PUBLIC_ONLY = "__public__";

	let search = "";
	let permissionFilter = ANY;
	let onlyMine = false;

	const has = (access: string | null) => !access || rank.hasPermission(access);

	function filterEndpoints(search: string, permissionFilter: string, onlyMine: boolean): AdminApiEndpoint[] {
		const q = search.trim().toLowerCase();
		return endpoints.filter((endpoint) => {
			if (permissionFilter === PUBLIC_ONLY && endpoint.access) return false;
			if (permissionFilter !== ANY && permissionFilter !== PUBLIC_ONLY && endpoint.access !== permissionFilter) {
				return false;
			}
			if (onlyMine && endpoint.access && !rank.hasPermission(endpoint.access)) return false;
			if (!q) return true;
			const haystack = [
				endpoint.verb,
				endpoint.route,
				endpoint.access || "",
				...endpoint.params.map((p) => `${p.type} ${p.name}`),
			]
				.join(" ")
				.toLowerCase();
			return haystack.includes(q);
		});
	}

	$: filtered = filterEndpoints(search, permissionFilter, onlyMine);
	$: heldPermissions = permissions.filter((p) => rank.hasPermission(p));
</script>

<svelte:head>
	<title>Admin API Reference</title>
</svelte:head>

{#await rank.promise then _}
	<Main>
		<div class="reference row">
			<div class="col-12">
				<h3>Admin API Reference</h3>
				<p>
					Every endpoint exposed by <code>AdminApi</code>. Requests are relative to
					<code>/admin-api/api/</code> and must carry the <code>x-csrf-token</code> header. Endpoints marked with a
					permission are guarded by <code>StaffFilter</code> &mdash; you need that permission to call them.
					You hold <strong>{heldPermissions.length}</strong> of {permissions.length} permissions.
				</p>
			</div>

			<div class="col-12 col-lg-6 mb-2">
				<label class="form-label mb-1" for="ref-search">Search</label>
				<input
					id="ref-search"
					type="search"
					class="form-control"
					placeholder="Route, method, permission, parameter..."
					bind:value={search}
				/>
			</div>
			<div class="col-12 col-sm-6 col-lg-3 mb-2">
				<label class="form-label mb-1" for="ref-permission">Permission</label>
				<select id="ref-permission" class="form-select" bind:value={permissionFilter}>
					<option value={ANY}>Any permission</option>
					<option value={PUBLIC_ONLY}>No permission required</option>
					{#each permissions as p}
						<option value={p}>{p}{rank.hasPermission(p) ? " (held)" : ""}</option>
					{/each}
				</select>
			</div>
			<div class="col-12 col-sm-6 col-lg-3 mb-2 d-flex align-items-end">
				<div class="form-check mb-2">
					<input class="form-check-input" type="checkbox" id="ref-only-mine" bind:checked={onlyMine} />
					<label class="form-check-label" for="ref-only-mine">Only endpoints I can call</label>
				</div>
			</div>

			<div class="col-12">
				<p class="text-muted mb-2">
					Showing {filtered.length} of {endpoints.length} endpoints.
				</p>
				{#if filtered.length === 0}
					<p>No endpoints match your filters.</p>
				{:else}
					<div class="table-responsive">
						<table class="table table-sm table-hover align-middle">
							<thead>
								<tr>
									<th scope="col">Method</th>
									<th scope="col">Route</th>
									<th scope="col">Permission</th>
									<th scope="col">Parameters</th>
								</tr>
							</thead>
							<tbody>
								{#each filtered as endpoint}
									<tr class={endpoint.access && !has(endpoint.access) ? "table-danger" : ""}>
										<td><span class="badge method">{endpoint.verb}</span></td>
										<td><code>{endpoint.route}</code></td>
										<td>
											{#if endpoint.access}
												<span class="badge permission">{endpoint.access}</span>
											{:else}
												<span class="text-muted">none</span>
											{/if}
										</td>
										<td>
											{#if endpoint.params.length === 0}
												<span class="text-muted">-</span>
											{:else}
												{#each endpoint.params as param}
													<code class="param">{param.type} {param.name}</code>
												{/each}
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>

			<div class="col-12 mt-3">
				<h4>Permissions</h4>
				<p class="text-muted">
					All values of the <code>Access</code> enum. Highlighted ones are assigned to your account.
				</p>
				<div class="permission-list">
					{#each permissions as p}
						<span class="badge permission" class:held={rank.hasPermission(p)}>{p}</span>
					{/each}
				</div>
			</div>
		</div>
	</Main>
{/await}

<style>
	.reference * {
		border-radius: 0 !important;
	}

	code.param {
		display: inline-block;
		margin-right: 0.5rem;
	}

	.badge.method {
		min-width: 3.5rem;
		text-align: center;
	}

	.badge.permission {
		font-weight: normal;
	}

	.badge.permission.held {
		font-weight: bold;
		text-decoration: underline;
	}

	.permission-list .badge {
		margin: 0 0.35rem 0.35rem 0;
	}
</style>
