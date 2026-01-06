#!/bin/bash

# Check if pzero-network exists, create if not
if ! docker network ls | grep -q "pzero-network"; then
    echo "Creating pzero-network..."
    docker network create pzero-network
else
    echo "pzero-network already exists"
fi

# Start Docker Compose services
docker compose up -d "$@"