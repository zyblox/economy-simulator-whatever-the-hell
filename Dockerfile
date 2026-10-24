# Start with Microsoft's official .NET SDK image so .NET is natively present
FROM ://microsoft.com

# Install Node.js and Go dependencies together
RUN apt-get update && apt-get install -y \
    curl \
    golang-go \
    && curl -fsSL https://nodesource.com | bash - \
    && apt-get install -y组件 nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set our application working directory
WORKDIR /app

# Copy all repository files into the container
COPY . .

# Grant execution rights to your master orchestration script
RUN chmod +x startall.sh

# Expose the port your server listens on
EXPOSE 5000

# Run the master script to start Node, Go, and .NET altogether
CMD ["./startall.sh"]
