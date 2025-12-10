# Build stage
FROM node:20-alpine AS builder

WORKDIR /build

# Install pnpm globally
RUN npm install -g pnpm@10.18.3

# Copy package files
COPY ./packages/wasm-ts/package.json ./packages/wasm-ts/asconfig.json ./
COPY ./packages/wasm-ts/assembly ./assembly

# Create build directory
RUN mkdir -p build

# Install dependencies
RUN npm install

# Build the WASM filter
RUN npm run asbuild

# Runtime stage
FROM envoyproxy/envoy:v1.30-latest AS runner

# Copy the built WASM file
COPY --from=builder /build/build/optimized.wasm /etc/envoy/wasm/challenge-handler.wasm

EXPOSE 8082

CMD ["envoy", "-c", "/etc/envoy/envoy.yaml"]
