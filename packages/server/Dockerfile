FROM node:22-alpine

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared-types ./packages/shared-types
COPY packages/server/package.json ./packages/server/

# Install pnpm
RUN npm install -g pnpm tsx

# Install dependencies (allow lockfile updates)
RUN pnpm install --no-frozen-lockfile

# Copy server source code
COPY packages/server ./packages/server

WORKDIR /app/packages/server

# Expose port
EXPOSE 8080

# Start the server using tsx directly
CMD ["tsx", "src/server.ts"]
