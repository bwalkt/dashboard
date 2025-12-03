#!/bin/bash

# Quick test script for Envoy WASM Filter
# Simple smoke test to verify the filter is working

set -e

ENVOY_WASM_URL="${ENVOY_WASM_URL:-http://localhost:8182}"
AUTHZ_SERVICE_URL="${AUTHZ_SERVICE_URL:-http://localhost:3002}"
CHALLENGE_SECRET="${CHALLENGE_SECRET:-default-secret-change-in-production}"

echo "=== Quick WASM Filter Test ==="

# Get a challenge
echo "1. Getting challenge from authz-service..."
challenge_response=$(curl -s -X POST "${AUTHZ_SERVICE_URL}/issue-challenge" \
    -H "Content-Type: application/json" \
    -d "{}")
challenge_id=$(echo "$challenge_response" | grep -o '"challengeId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$challenge_id" ]; then
    echo "ERROR: Failed to get challenge"
    exit 1
fi

echo "   Challenge ID: $challenge_id"

# Compute answer
challenge_answer=$(echo -n "${challenge_id}${CHALLENGE_SECRET}" | shasum -a 256 | cut -d' ' -f1)
echo "   Challenge answer: $challenge_answer"

# Test public route (should work without challenge)
echo "2. Testing public route /health (should bypass validation)..."
status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "User-Agent: Mozilla/5.0 (Test Script)" \
    "${ENVOY_WASM_URL}/health")
if [ "$status" == "200" ]; then
    echo "   ✓ PASS - Public route works"
else
    echo "   ✗ FAIL - Expected 200, got $status"
    exit 1
fi

# Test protected route without challenge (should fail)
echo "3. Testing protected route without challenge (should fail)..."
status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "User-Agent: Mozilla/5.0 (Test Script)" \
    "${ENVOY_WASM_URL}/api/test")
if [ "$status" == "403" ]; then
    echo "   ✓ PASS - Protected route correctly rejects request"
else
    echo "   ✗ FAIL - Expected 403, got $status"
    exit 1
fi

# Test protected route with valid challenge (should work)
echo "4. Testing protected route with valid challenge..."
status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "User-Agent: Mozilla/5.0 (Test Script)" \
    -H "x-challenge-id: ${challenge_id}" \
    -H "x-challenge-answer: ${challenge_answer}" \
    "${ENVOY_WASM_URL}/api/test")
if [ "$status" == "200" ]; then
    echo "   ✓ PASS - Valid challenge accepted"
else
    echo "   ✗ FAIL - Expected 200, got $status"
    exit 1
fi

# Test protected route with invalid challenge (should fail)
echo "5. Testing protected route with invalid challenge..."
status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "User-Agent: Mozilla/5.0 (Test Script)" \
    -H "x-challenge-id: ${challenge_id}" \
    -H "x-challenge-answer: wrong-answer" \
    "${ENVOY_WASM_URL}/api/test")
if [ "$status" == "403" ]; then
    echo "   ✓ PASS - Invalid challenge correctly rejected"
else
    echo "   ✗ FAIL - Expected 403, got $status"
    exit 1
fi

echo ""
echo "✓ All quick tests passed!"

