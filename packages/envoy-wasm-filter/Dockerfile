# Build stage
FROM rust:1.82-alpine AS builder

# Install necessary packages
RUN apk add --no-cache musl-dev

WORKDIR /build

# Install WASM target
RUN rustup target add wasm32-wasi

# Copy Rust WASM filter
COPY ./packages/rust-wasm-filter/Cargo.toml ./packages/rust-wasm-filter/Cargo.lock* ./
COPY ./packages/rust-wasm-filter/src ./src

# Download dependencies
RUN cargo fetch

# Build the WASM filter
RUN cargo build --target wasm32-wasi --release

# Rename to expected output
RUN cp target/wasm32-wasi/release/rust_wasm_filter.wasm filter.wasm

# Output stage
FROM envoyproxy/envoy:v1.33-latest AS runner

COPY --from=builder /build/filter.wasm /etc/envoy/wasm/challenge-authz.wasm
EXPOSE 8081

CMD ["envoy", "-c", "/etc/envoy/envoy.yaml"]


