# Build from repo root: docker build -f packages/perf/Dockerfile .
FROM grafana/k6:1.5.0 AS k6

# Stage 1: Build UI (Vite) — only workspace root + perf package.json + ui/
FROM node:22-alpine AS ui-builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/perf/package.json packages/perf/
COPY packages/perf/ui packages/perf/ui
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @pzero/perf run build:ui

# Stage 2: Build k6 tests — only workspace root + perf package.json + tests/ + tsconfig.tests.json
FROM node:22-alpine AS test-builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/perf/package.json packages/perf/
COPY packages/perf/tests packages/perf/tests
COPY packages/perf/tsconfig.tests.json packages/perf/
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @pzero/perf run build:k6

# Stage 3: Build server + production deps — only workspace root + perf package.json + src/ + tsconfig.json
# Use pnpm deploy to get a portable dir with isolated node_modules (copying node_modules breaks pnpm symlinks).
FROM node:22-alpine AS server-builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/perf/package.json packages/perf/
COPY packages/perf/src packages/perf/src
COPY packages/perf/tsconfig.json packages/perf/
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @pzero/perf exec tsc
RUN pnpm --filter @pzero/perf --prod deploy /app/deploy --legacy
RUN cp -r packages/perf/dist /app/deploy/dist

# Final stage: minimal runtime (no TS sources). Copy only deploy output + UI + k6 dist.
FROM node:22-alpine
COPY --from=k6 /usr/bin/k6 /usr/local/bin/k6
COPY --from=server-builder /app/deploy/node_modules /app/node_modules
COPY --from=server-builder /app/deploy/dist /app/dist
COPY --from=server-builder /app/deploy/package.json /app/package.json
COPY --from=ui-builder /app/packages/perf/ui/dist /app/ui/dist
COPY --from=test-builder /app/packages/perf/k6-dist/. /app/perf-dist/
WORKDIR /app
ENV NODE_ENV=production
ENV PERF_WORKSPACE=/app/perf-dist
EXPOSE 8099
CMD ["node", "dist/server.js"]
