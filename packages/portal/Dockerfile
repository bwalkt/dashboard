# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.18.3

# Build arguments for Vite environment variables
ARG VITE_BACKEND_URL


# Set build-time environment variables
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_CONFIG_BREADCRUMB=true
ENV VITE_POSTHOG_API_KEY="phc_example1234567890" # This is an example PostHog API key
ENV VITE_POSTHOG_HOST="https://us.i.posthog.com" # This is a placeholder for the PostHog host
ENV VITE_TABLE_DEBUG=false # This is a placeholder for the table debug mode
ENV VITE_SENTRY_DSN="https://examplePublicKey@o0.ingest.sentry.io/0" # This is an example Sentry DSN
ENV VITE_SENTRY_DISABLED=true # This is a placeholder for the Sentry disabled mode

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

