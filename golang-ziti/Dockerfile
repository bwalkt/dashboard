# Use official Go image
FROM golang:latest AS builder

# Set working directory
WORKDIR /app

# Install git (needed for Go modules)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy go mod files
COPY golang-ziti/go.mod golang-ziti/go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY golang-ziti/ .

RUN mkdir -p build

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o build/main .

# Final stage
FROM alpine:latest

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates curl

WORKDIR /app

# Copy the binary from builder stage
COPY --from=builder /app/build/main .

# Copy the Ziti configuration file
COPY golang-ziti/simple-server.json .
COPY golang-ziti/simple-client.json .


# Expose port (though it won't be used with Ziti)
EXPOSE 8080

# Run the application
CMD ["./main", "simple-server.json", "simpleService"]
