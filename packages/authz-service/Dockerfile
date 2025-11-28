FROM node:22-alpine

WORKDIR /app

# Install pnpm (needs root)
RUN npm install -g pnpm@10.18.3

# Create a non-root user with a safe UID/GID
# Using UID/GID 1000:1000 which is standard for non-root users
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

# Copy workspace files (as root)
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/authz-service/package.json ./packages/authz-service/
COPY packages/authz-service/tsconfig.json ./packages/authz-service/

# Install dependencies with workspace support (as root)
RUN pnpm install --no-frozen-lockfile

# Copy source code (as root)
COPY packages/authz-service/src ./packages/authz-service/src

# Build TypeScript (as root)
WORKDIR /app/packages/authz-service
RUN pnpm run build

# Change ownership of application files to non-root user
# This includes the working directory and all files
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Set working directory to the package
WORKDIR /app/packages/authz-service

# Expose port
EXPOSE 3000

# Run the server as non-root user
CMD ["node", "dist/server.js"]

