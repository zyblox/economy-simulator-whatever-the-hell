# Start with a Node base image since your primary framework is Node
FROM node:18-bullseye

# Install Go and .NET SDK dependencies natively
RUN apt-get update && apt-get install -y \
    golang-go \
    dotnet-sdk-7.0 \
    && rm -rf /var/lib/apt/lists/*

# Set our application working directory
WORKDIR /app

# Copy all repository files into the container
COPY . .

# Grant execution rights to the orchestration script
RUN chmod +x startall.sh

# Expose the port your server listens on
EXPOSE 5000

# Run the master script to start Node, Go, and .NET altogether
CMD ["./startall.sh"]
