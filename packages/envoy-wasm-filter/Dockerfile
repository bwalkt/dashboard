# Build stage
FROM tinygo/tinygo:0.31.0 AS builder

WORKDIR /build

# Copy go mod files
COPY go.mod go.sum* ./

# Download dependencies
RUN go mod download

# Copy source code
COPY main.go ./

# Build the WASM filter
RUN tinygo build -o filter.wasm -scheduler=none -target=wasi main.go

# Output stage - just copy the WASM file
FROM scratch AS output
COPY --from=builder /build/filter.wasm /filter.wasm


