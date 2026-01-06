#!/bin/bash

# Check if pzero-network exists, create if not
if ! docker network ls | grep -q "pzero-network"; then
    echo "Creating pzero-network..."
    if ! docker network create pzero-network; then
        echo "Error: Failed to create pzero-network" >&2
        exit 1
    fi
else
    echo "pzero-network already exists"
fi

# Start Docker Compose services
if ! docker compose up -d "$@"; then
    echo "Error: docker compose up failed" >&2
    exit 1
fi