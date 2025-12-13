#!/bin/bash

echo "🧪 Testing B2B SFDC Server - Envoy WASM Filter Integration"
echo "==========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local description="$1"
    local url="$2"
    local headers="$3"
    local expected_code="$4"
    
    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "URL: $url"
    
    if [ -n "$headers" ]; then
        echo "Headers: $headers"
        response=$(curl -s -o /dev/null -w "%{http_code}" $headers "$url")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    fi
    
    if [ "$response" = "$expected_code" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Got expected status code: $response"
    else
        echo -e "${RED}❌ FAIL${NC} - Expected: $expected_code, Got: $response"
    fi
}

echo -e "\n${YELLOW}🏥 Health Checks${NC}"
echo "=================="

# Test 1: Direct SFDC server health check
test_endpoint "Direct SFDC Server Health" "http://localhost:3000/health" "" "200"

# Test 2: Envoy-filtered health check (should work - public route)
test_endpoint "Envoy-Filtered Health Check" "http://localhost:3001/health" "" "200"

echo -e "\n${YELLOW}🔐 Authentication Endpoints (Public Routes)${NC}"
echo "=============================================="

# Test 3: GitHub OAuth login (should work through filter)
test_endpoint "GitHub OAuth Login (via Envoy)" "http://localhost:3001/auth/login" "" "302"

# Test 4: Direct GitHub OAuth login
test_endpoint "GitHub OAuth Login (Direct)" "http://localhost:3000/auth/login" "" "302"

echo -e "\n${YELLOW}🛡️ Protected Endpoints (Challenge Required)${NC}"
echo "============================================="

# Test 5: Protected endpoint without challenge headers (should fail)
test_endpoint "Salesforce Query (No Challenge)" "http://localhost:3001/salesforce/Account/query" "" "403"

# Test 6: Protected endpoint with invalid challenge headers (should fail)
test_endpoint "Salesforce Query (Invalid Challenge)" "http://localhost:3001/salesforce/Account/query" "-H 'x-challenge-id: invalid' -H 'x-challenge-answer: invalid'" "403"

# Test 7: Direct access (should work if authenticated)
test_endpoint "Direct Salesforce Query" "http://localhost:3000/salesforce/Account/query" "" "401"

echo -e "\n${YELLOW}📊 Service Status${NC}"
echo "=================="

echo -e "\nDocker containers:"
docker-compose --env-file .env.test ps

echo -e "\nEnvoy admin interface:"
curl -s http://localhost:9902/ready || echo "Envoy admin not ready"

echo -e "\n${GREEN}🎯 Test Summary${NC}"
echo "================="
echo "• Port 3000: Direct SFDC server access (no filtering)"
echo "• Port 3001: Envoy-filtered access (challenge required)"
echo "• Port 9902: Envoy admin interface"
echo ""
echo "To test with valid challenges, use the authz-service to generate valid challenge pairs."