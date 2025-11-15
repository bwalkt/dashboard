#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install

# Create build directory if it doesn't exist
mkdir -p build

# Build the Wasm module
echo "Building Wasm module..."
npm run build

# Check if build was successful
if [ -f "build/header-validator.wasm" ]; then
    echo "Build successful! Wasm module created at: build/header-validator.wasm"
    echo "File size: $(ls -lh build/header-validator.wasm | awk '{print $5}')"
else
    echo "Build failed!"
    exit 1
fi