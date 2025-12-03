# Build stage
FROM tinygo/tinygo:0.31.0 AS builder

WORKDIR /build

# Copy go mod files
COPY ./packages/envoy-wasm-filter/go.mod ./packages/envoy-wasm-filter/go.sum* ./

# Download dependencies
RUN go mod download

# Copy all Go source files
COPY ./packages/envoy-wasm-filter/*.go ./

# Build the WASM filter
RUN tinygo build -o filter.wasm -scheduler=none -target=wasi .

# Output stage
FROM envoyproxy/envoy:v1.30-latest AS runner

COPY --from=builder /build/filter.wasm /etc/envoy/wasm/challenge-authz.wasm
EXPOSE 8081

CMD ["envoy", "-c", "/etc/envoy/envoy.yaml"]


