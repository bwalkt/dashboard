FROM node:22-alpine

WORKDIR /app

# Install PostgreSQL client for debugging (optional)
RUN apk add --no-cache postgresql-client

# Copy workspace files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared ./packages/shared
COPY packages/server/package.json ./packages/server/

# Install pnpm
RUN npm install -g pnpm tsx

# Install dependencies (allow lockfile updates)
RUN pnpm install --no-frozen-lockfile

# Build shared package
RUN pnpm --filter @pzero/shared build

# Copy server source code
COPY /packages/server ./packages/server

WORKDIR /app/packages/server

# Expose port
EXPOSE 8080

# Start the server using tsx directly
# Environment variables will be provided at runtime via docker-compose
CMD ["tsx", "src/server.ts"]
