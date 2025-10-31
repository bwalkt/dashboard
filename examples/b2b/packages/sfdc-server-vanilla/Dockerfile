FROM node:22-alpine

WORKDIR /app

# Install build tools required for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ sqlite-dev

# Copy workspace files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared ./packages/shared
COPY examples/b2b/packages/sfdc-server-vanilla/package.json ./examples/b2b/packages/sfdc-server-vanilla/

# Install pnpm
RUN npm install -g pnpm tsx

# Install dependencies (allow lockfile updates)
RUN pnpm install --no-frozen-lockfile

# Build shared package
RUN pnpm --filter @pzero/shared build

# Copy server source code
COPY examples/b2b/packages/sfdc-server-vanilla ./examples/b2b/packages/sfdc-server-vanilla

WORKDIR /app/examples/b2b/packages/sfdc-server-vanilla

# Rebuild better-sqlite3 for the container architecture
# Using npm rebuild instead of pnpm because pnpm requires interactive approval of build scripts
RUN cd /app/node_modules/.pnpm/better-sqlite3@12.4.1/node_modules/better-sqlite3 && npm rebuild

# Expose port
EXPOSE 8080

# Start the server using tsx directly
# Environment variables will be provided at runtime via docker-compose
CMD ["tsx", "src/server.ts"]
