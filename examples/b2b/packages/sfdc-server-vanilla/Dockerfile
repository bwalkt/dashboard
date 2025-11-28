# =============================================================================
# Build Stage
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install build tools required for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ sqlite-dev

# Install pnpm globally
RUN npm install -g pnpm@10.18.3

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

# Copy shared package files
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared ./packages/shared

# Copy server package.json
COPY examples/b2b/packages/sfdc-server-vanilla/package.json ./examples/b2b/packages/sfdc-server-vanilla/

# Install all dependencies (including dev dependencies for building)
RUN pnpm install --no-frozen-lockfile

# Build shared package
RUN pnpm --filter @pzero/shared build

# Copy server source code
COPY examples/b2b/packages/sfdc-server-vanilla ./examples/b2b/packages/sfdc-server-vanilla

# Build TypeScript to JavaScript
RUN pnpm --filter @pzero/sfdc-server-vanilla build

# Rebuild better-sqlite3 for the container architecture
RUN BETTER_SQLITE3_PATH=$(find /app/node_modules -name "better-sqlite3" -type d -path "*/node_modules/better-sqlite3" | head -1) && \
    if [ -n "$BETTER_SQLITE3_PATH" ]; then \
      cd "$BETTER_SQLITE3_PATH" && npm rebuild && \
      echo "better-sqlite3 built at: $BETTER_SQLITE3_PATH" && \
      ls -la "$BETTER_SQLITE3_PATH/build/Release" || true; \
    else \
      echo "Warning: better-sqlite3 not found, skipping rebuild"; \
    fi

# =============================================================================
# Production Stage
# =============================================================================
FROM node:22-alpine AS production

WORKDIR /app

# Install only runtime dependencies for sqlite (not build tools)
# sqlite-libs provides runtime libraries for better-sqlite3
RUN apk add --no-cache sqlite-libs

# Install pnpm globally (no tsx needed since we're running compiled JS)
RUN npm install -g pnpm@10.18.3

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

# Copy built shared package (only package.json and dist directory)
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy server package.json and built dist directory (not source files)
COPY --from=builder /app/examples/b2b/packages/sfdc-server-vanilla/package.json ./examples/b2b/packages/sfdc-server-vanilla/
COPY --from=builder /app/examples/b2b/packages/sfdc-server-vanilla/dist ./examples/b2b/packages/sfdc-server-vanilla/dist

# Copy the .pnpm store from builder (contains pre-built better-sqlite3)
# This allows pnpm to reuse the built packages without rebuilding
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm

# Install production dependencies
# pnpm will link to packages already in .pnpm store, including built better-sqlite3
RUN pnpm install --prod --no-frozen-lockfile

# Clean up unnecessary files to further reduce image size
RUN rm -rf /tmp/* /var/cache/apk/* && \
    find /app/node_modules -type f -name "*.map" -delete 2>/dev/null || true && \
    find /app/node_modules -type f -name "*.ts" ! -path "*/node_modules/@types/*" -delete 2>/dev/null || true && \
    find /app/node_modules -type d \( -name "test" -o -name "tests" -o -name "__tests__" -o -name "docs" \) -prune -exec rm -rf {} + 2>/dev/null || true && \
    find /app/node_modules -type f \( -name "README.md" -o -name "CHANGELOG.md" -o -name "LICENSE*" -o -name "*.md" \) -delete 2>/dev/null || true

WORKDIR /app/examples/b2b/packages/sfdc-server-vanilla

# Expose port
EXPOSE 8080

# Start the server using the compiled JavaScript
# Environment variables will be provided at runtime via docker-compose
CMD ["node", "dist/server.js"]
