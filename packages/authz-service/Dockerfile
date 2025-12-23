# =============================================================================
# Build Stage
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install PostgreSQL client for debugging (optional, can be removed in production)
RUN apk add --no-cache postgresql-client

# Install pnpm globally
RUN npm install -g pnpm@10.18.3

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

# Copy shared package files (needed for authz-service)
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/tsconfig.*.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src

# Copy authz-service package.json
COPY packages/authz-service/package.json ./packages/authz-service/
COPY packages/authz-service/tsconfig.json ./packages/authz-service/

# Install all dependencies (including dev dependencies for building)
RUN pnpm install --frozen-lockfile

# Build shared package first
WORKDIR /app/packages/shared
RUN pnpm run build

# Copy authz-service source code
COPY packages/authz-service/src /app/packages/authz-service/src

# Build TypeScript to JavaScript
WORKDIR /app/packages/authz-service
RUN pnpm run build

# =============================================================================
# Production Stage
# =============================================================================
FROM node:22-alpine AS production

WORKDIR /app

# Install PostgreSQL client for debugging (optional)
RUN apk add --no-cache postgresql-client

# Install pnpm globally (no tsx needed since we're running compiled JS)
RUN npm install -g pnpm@10.18.3

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

# Copy shared package.json and built dist directory
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy authz-service package.json and built dist directory (not source files)
COPY --from=builder /app/packages/authz-service/package.json ./packages/authz-service/
COPY --from=builder /app/packages/authz-service/dist ./packages/authz-service/dist

# Copy the .pnpm store from builder (contains all built packages)
# This allows pnpm to reuse the built packages without rebuilding
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm

# Install production dependencies
# pnpm will link to packages already in .pnpm store
RUN pnpm install --prod --frozen-lockfile

# Clean up unnecessary files to further reduce image size
RUN rm -rf /tmp/* /var/cache/apk/* && \
    find /app/node_modules -type f -name "*.map" -delete 2>/dev/null || true && \
    find /app/node_modules -type f -name "*.ts" ! -path "*/node_modules/@types/*" -delete 2>/dev/null || true && \
    find /app/node_modules -type d \( -name "test" -o -name "tests" -o -name "__tests__" -o -name "docs" \) -prune -exec rm -rf {} + 2>/dev/null || true && \
    find /app/node_modules -type f \( -name "README.md" -o -name "CHANGELOG.md" -o -name "LICENSE*" -o -name "*.md" \) -delete 2>/dev/null || true

WORKDIR /app/packages/authz-service

# Expose port
EXPOSE 3000

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Change ownership to application directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Start the server using the compiled JavaScript
# Environment variables will be provided at runtime via docker-compose
CMD ["node", "dist/server.js"]

