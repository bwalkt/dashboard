# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.18.3

# Build arguments for Vite environment variables
ARG VITE_BACKEND_URL
ARG VITE_PROXY_URL
ARG VITE_OTEL_EXPORTER_URL
ARG VITE_CHALLENGE_SECRET


# Set build-time environment variables
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_USE_PROXY=true
ENV VITE_PROXY_URL=${VITE_PROXY_URL}
ENV VITE_PROXY_TARGET=1
ENV VITE_OTEL_EXPORTER_URL=${VITE_OTEL_EXPORTER_URL}
ENV VITE_CHALLENGE_SECRET=${VITE_CHALLENGE_SECRET}

# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY examples/b2b/packages/sfdc-example ./examples/b2b/packages/sfdc-example

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared package
RUN pnpm --filter @pzero/shared build

# Build React app
WORKDIR /app/examples/b2b/packages/sfdc-example
RUN pnpm build

# Production stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/examples/b2b/packages/sfdc-example/dist /usr/share/nginx/html

# Copy nginx configuration for SPA routing
COPY examples/b2b/packages/sfdc-example/nginx.conf /etc/nginx/conf.d/default.conf=-0-=-09-=-09-=-09o0-=-0

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

