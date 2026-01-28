#!/bin/sh
set -e

# Script to build and run k6 performance tests with Docker
# Loads environment variables from .env file

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
IMAGE_NAME="perf-tests"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_error() {
    echo "${RED}Error: $1${NC}" >&2
}

print_success() {
    echo "${GREEN}$1${NC}"
}

print_warning() {
    echo "${YELLOW}Warning: $1${NC}"
}

print_info() {
    echo "$1"
}

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    print_error ".env file not found at $ENV_FILE"
    print_info ""
    print_info "Please create a .env file with the following variables:"
    print_info "  AUTH_TOKEN=your_jwt_token_here"
    print_info "  PROXY_TARGET=http://pzero-sfdc-server:3000"
    print_info "  BASE_URL=https://pzero-envoy.incmix.com/proxy"
    print_info ""
    print_info "Example:"
    print_info "  echo 'AUTH_TOKEN=your_token' > $ENV_FILE"
    exit 1
fi

# Validate that AUTH_TOKEN is set in .env
if ! grep -q "^AUTH_TOKEN=" "$ENV_FILE"; then
    print_error "AUTH_TOKEN not found in .env file"
    print_info "Please add AUTH_TOKEN=your_jwt_token_here to $ENV_FILE"
    exit 1
fi

print_info "Building Docker image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" "$SCRIPT_DIR"

if [ $? -ne 0 ]; then
    print_error "Docker build failed"
    exit 1
fi

print_success "Docker image built successfully"
print_info ""

# Check if user wants to run a specific test
if [ "$1" != "" ]; then
    TEST_FILE="$1"
    print_info "Running specific test: $TEST_FILE"
    docker run --rm \
        --env-file "$ENV_FILE" \
        --entrypoint k6 \
        "$IMAGE_NAME" run "/tests/dist/$TEST_FILE"
else
    print_info "Running all tests with environment variables from .env"
    docker run --rm \
        --env-file "$ENV_FILE" \
        "$IMAGE_NAME"
fi

if [ $? -eq 0 ]; then
    print_success "Tests completed successfully"
else
    print_error "Tests failed"
    exit 1
fi
