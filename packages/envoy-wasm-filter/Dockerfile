# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /build

# Copy go mod files
COPY ./packages/envoy-wasm-filter/go.mod ./packages/envoy-wasm-filter/go.sum* ./

# Download dependencies
RUN go mod download

# Copy src directory maintaining structure
COPY ./packages/envoy-wasm-filter/src ./src

# Build the WASM filter with upstream Go and GOOS=wasip1
RUN env GOOS=wasip1 GOARCH=wasm go build -buildmode=c-shared -o filter.wasm ./src

# Output stage
FROM envoyproxy/envoy:v1.33-latest AS runner

COPY --from=builder /build/filter.wasm /etc/envoy/wasm/challenge-authz.wasm
EXPOSE 8081

CMD ["envoy", "-c", "/etc/envoy/envoy.yaml"]


