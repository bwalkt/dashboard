FROM --platform=linux/arm64 node:22-slim

WORKDIR /app

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

# Expose port
EXPOSE 8080

# Start the server using tsx directly
CMD ["tsx", "src/server.ts"]
