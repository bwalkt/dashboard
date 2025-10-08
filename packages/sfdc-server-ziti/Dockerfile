FROM node:22-alpine

WORKDIR /app

# Install OpenZiti CLI tools and dependencies
RUN apk add --no-cache \
    curl \
    wget \
    ca-certificates \
    && wget -O /tmp/ziti-cli.tar.gz https://github.com/openziti/ziti/releases/latest/download/ziti-linux-amd64-0.38.0.tar.gz \
    && tar -xzf /tmp/ziti-cli.tar.gz -C /tmp \
    && mv /tmp/ziti /usr/local/bin/ \
    && chmod +x /usr/local/bin/ziti \
    && rm -rf /tmp/ziti-cli.tar.gz /tmp/ziti

# Copy workspace files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared-types ./packages/shared-types
COPY packages/sfdc-server-ziti/package.json ./packages/sfdc-server-ziti/

# Install pnpm
RUN npm install -g pnpm tsx

# Install dependencies (allow lockfile updates)
RUN pnpm install --no-frozen-lockfile

# Copy server source code
COPY packages/sfdc-server-ziti ./packages/sfdc-server-ziti

WORKDIR /app/packages/sfdc-server-ziti

# Create OpenZiti configuration directory
RUN mkdir -p ./config

# Create default OpenZiti configuration files
RUN echo '{"id":"default","name":"sfdc-server-identity","ca":"","cert":"","key":"","server_cert":"","server_key":""}' > ./config/ziti-identity.json \
    && echo '{"hostname":"localhost","port":8080,"identity":"./config/ziti-identity.json","services":[{"name":"sfdc-api-server","protocol":"tcp","hostname":"127.0.0.1","port":8080}]}' > ./config/tunneler.json

# Expose port
EXPOSE 8080

# Set environment variables for OpenZiti
ENV OPENZITI_ENABLED=false
ENV OPENZITI_CONTROLLER_URL=https://localhost:1280
ENV OPENZITI_IDENTITY_PATH=./config/ziti-identity.json
ENV OPENZITI_SERVICE_NAME=sfdc-api-server
ENV OPENZITI_LOCAL_ADDRESS=0.0.0.0:8080
ENV OPENZITI_TUNNELER_ENABLED=false
ENV OPENZITI_TUNNELER_CONFIG_PATH=./config/tunneler.json

# Start the server using tsx directly
CMD ["tsx", "src/server.ts"]
