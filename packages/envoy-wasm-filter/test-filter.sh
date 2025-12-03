#!/bin/bash

# Test script for Envoy WASM Filter
# Tests challenge validation, public routes, and error cases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVOY_WASM_URL="${ENVOY_WASM_URL:-http://localhost:8182}"
AUTHZ_SERVICE_URL="${AUTHZ_SERVICE_URL:-http://localhost:3002}"
CHALLENGE_SECRET="${CHALLENGE_SECRET:-default-secret-change-in-production}"

echo -e "${YELLOW}=== Envoy WASM Filter Test Suite ===${NC}\n"

# Helper function to compute challenge answer
compute_challenge_answer() {
    local challenge_id=$1
    echo -n "${challenge_id}${CHALLENGE_SECRET}" | shasum -a 256 | cut -d' ' -f1
}

# Helper function to make HTTP request
make_request() {
    local method=$1
    local path=$2
    local challenge_id=$3
    local challenge_answer=$4
    local expected_status=$5
    local description=$6
    
    echo -e "\n${YELLOW}Test: ${description}${NC}"
    echo "  Method: ${method}"
    echo "  Path: ${path}"
    if [ -n "$challenge_id" ]; then
        echo "  Challenge ID: ${challenge_id}"
    fi
    
    if [ -z "$challenge_answer" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "${method}" \
            "${ENVOY_WASM_URL}${path}" \
            -H "Content-Type: application/json" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X "${method}" \
            "${ENVOY_WASM_URL}${path}" \
            -H "Content-Type: application/json" \
            -H "x-challenge-id: ${challenge_id}" \
            -H "x-challenge-answer: ${challenge_answer}" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "$expected_status" ]; then
        echo -e "  ${GREEN}✓ PASS${NC} - Status: ${http_code}"
        if [ -n "$body" ] && [ "$body" != "null" ]; then
            echo "  Response: $body"
        fi
        return 0
    else
        echo -e "  ${RED}✗ FAIL${NC} - Expected: ${expected_status}, Got: ${http_code}"
        if [ -n "$body" ] && [ "$body" != "null" ]; then
            echo "  Response: $body"
        fi
        return 1
    fi
}

# Test counter
PASSED=0
FAILED=0

# Test 1: Get a challenge from authz-service
echo -e "\n${YELLOW}=== Step 1: Get Challenge from Authz Service ===${NC}"
challenge_response=$(curl -s -X POST "${AUTHZ_SERVICE_URL}/issue-challenge" \
    -H "Content-Type: application/json")
challenge_id=$(echo "$challenge_response" | grep -o '"challengeId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$challenge_id" ]; then
    echo -e "${RED}✗ FAIL${NC} - Failed to get challenge from authz-service"
    echo "Response: $challenge_response"
    exit 1
fi

echo -e "${GREEN}✓ Challenge obtained${NC}: ${challenge_id}"
challenge_answer=$(compute_challenge_answer "$challenge_id")
echo "  Expected answer: ${challenge_answer}"

# Test 2: Test public routes (should bypass validation)
echo -e "\n${YELLOW}=== Step 2: Test Public Routes (Should Bypass Validation) ===${NC}"

make_request "GET" "/health" "" "" "200" "Public route: /health" && ((PASSED++)) || ((FAILED++))
make_request "GET" "/auth/test" "" "" "200" "Public route: /auth/*" && ((PASSED++)) || ((FAILED++))
make_request "GET" "/centrifugo/test" "" "" "200" "Public route: /centrifugo/*" && ((PASSED++)) || ((FAILED++))
make_request "GET" "/sms/test" "" "" "200" "Public route: /sms/*" && ((PASSED++)) || ((FAILED++))
make_request "GET" "/email/test" "" "" "200" "Public route: /email/*" && ((PASSED++)) || ((FAILED++))
make_request "GET" "/assets/test.png" "" "" "200" "Public route: /assets/*" && ((PASSED++)) || ((FAILED++))
make_request "OPTIONS" "/any/path" "" "" "200" "OPTIONS request (CORS preflight)" && ((PASSED++)) || ((FAILED++))

# Test 3: Test protected routes without challenge (should fail)
echo -e "\n${YELLOW}=== Step 3: Test Protected Routes Without Challenge ===${NC}"

make_request "GET" "/api/test" "" "" "403" "Protected route without challenge headers" && ((PASSED++)) || ((FAILED++))
make_request "POST" "/api/data" "" "" "403" "Protected route without challenge headers" && ((PASSED++)) || ((FAILED++))

# Test 4: Test protected routes with invalid challenge
echo -e "\n${YELLOW}=== Step 4: Test Protected Routes With Invalid Challenge ===${NC}"

make_request "GET" "/api/test" "invalid-id" "invalid-answer" "403" "Invalid challenge ID" && ((PASSED++)) || ((FAILED++))
make_request "GET" "/api/test" "$challenge_id" "wrong-answer" "403" "Wrong challenge answer" && ((PASSED++)) || ((FAILED++))

# Test 5: Test protected routes with valid challenge
echo -e "\n${YELLOW}=== Step 5: Test Protected Routes With Valid Challenge ===${NC}"

make_request "GET" "/api/test" "$challenge_id" "$challenge_answer" "200" "Valid challenge (first request - cache miss)" && ((PASSED++)) || ((FAILED++))
make_request "GET" "/api/test" "$challenge_id" "$challenge_answer" "200" "Valid challenge (second request - cache hit)" && ((PASSED++)) || ((FAILED++))
make_request "POST" "/api/data" "$challenge_id" "$challenge_answer" "200" "Valid challenge on POST request" && ((PASSED++)) || ((FAILED++))

# Test 6: Test /validate endpoint directly
echo -e "\n${YELLOW}=== Step 6: Test /validate Endpoint Directly ===${NC}"

validate_response=$(curl -s -X POST "${AUTHZ_SERVICE_URL}/validate" \
    -H "Content-Type: application/json" \
    -d "{\"challengeId\":\"${challenge_id}\",\"challengeAnswer\":\"${challenge_answer}\"}")

if echo "$validate_response" | grep -q '"ok":true'; then
    echo -e "${GREEN}✓ PASS${NC} - /validate endpoint works correctly"
    echo "  Response: $validate_response"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} - /validate endpoint failed"
    echo "  Response: $validate_response"
    ((FAILED++))
fi

# Test 7: Test with missing challenge headers
echo -e "\n${YELLOW}=== Step 7: Test Missing Challenge Headers ===${NC}"

response=$(curl -s -w "\n%{http_code}" -X GET "${ENVOY_WASM_URL}/api/test" \
    -H "Content-Type: application/json" 2>&1)
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" == "403" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Missing challenge headers correctly rejected (Status: 403)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} - Expected 403, got ${http_code}"
    ((FAILED++))
fi

# Test 8: Test expired challenge (if we can simulate)
echo -e "\n${YELLOW}=== Step 8: Test Invalid Challenge ID ===${NC}"

fake_id="nonexistent-$(date +%s)"
fake_answer=$(compute_challenge_answer "$fake_id")
make_request "GET" "/api/test" "$fake_id" "$fake_answer" "403" "Non-existent challenge ID" && ((PASSED++)) || ((FAILED++))

# Summary
echo -e "\n${YELLOW}=== Test Summary ===${NC}"
echo -e "Total tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi


