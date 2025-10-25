# Use official Go image
FROM golang:latest AS builder

# Set working directory
WORKDIR /app

# Install git (needed for Go modules)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy go mod files
COPY golang-proxy/go.mod golang-proxy/go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY golang-proxy/ .

RUN mkdir -p build

# Build the application (static build with pure Go SQLite)
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags '-extldflags "-static"' -o main .

# Final stage
FROM alpine:latest

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates curl

WORKDIR /app

# Copy the binary from builder stage
COPY --from=builder /app/main .
RUN chmod +x main

# Copy the Ziti configuration file
COPY golang-proxy/simple-server.json .
COPY golang-proxy/simple-client.json .

# Copy all .pem files
COPY golang-proxy/*.pem .

# Copy environment file
COPY golang-proxy/.env .

# Create data directory for database
RUN mkdir -p /app/data

# Expose port (though it won't be used with Ziti)
EXPOSE 8080

# Run the application
CMD ["./main", "simple-server.json", "simpleService"]
