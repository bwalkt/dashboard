# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.18.3

# Build arguments for Vite environment variables
ARG VITE_BACKEND_URL
ARG VITE_CONFIG_BREADCRUMB
ARG VITE_POSTHOG_API_KEY
ARG VITE_POSTHOG_HOST
ARG VITE_TABLE_DEBUG
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_DISABLED

# Set build-time environment variables
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_CONFIG_BREADCRUMB=${VITE_CONFIG_BREADCRUMB}
ENV VITE_POSTHOG_API_KEY=${VITE_POSTHOG_API_KEY}
ENV VITE_POSTHOG_HOST=${VITE_POSTHOG_HOST}
ENV VITE_TABLE_DEBUG=${VITE_TABLE_DEBUG}
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
ENV VITE_SENTRY_DISABLED=${VITE_SENTRY_DISABLED}

# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY packages/portal ./packages/portal

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared package
RUN pnpm --filter @pzero/shared build

# Build React app
WORKDIR /app/packages/portal
RUN pnpm build

# Production stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/packages/portal/dist /usr/share/nginx/html

# Copy nginx configuration for SPA routing
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

