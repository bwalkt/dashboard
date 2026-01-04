#!/bin/bash
set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "Checking server status..."
if ! curl -s http://localhost:8091/health > /dev/null 2>&1; then
  echo -e "${RED}✗ Error: Server not running on localhost:8091${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"

echo -e "\n${YELLOW}Testing Redis-based challenge validation...${NC}"

# Test 1: Valid challenge
echo -e "\n1. Testing VALID challenge (id=1, answer=1):"
HTTP_CODE=$(curl -s -o /tmp/test_response_1.txt -w "%{http_code}" \
  -H "Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJvb3RAbG9jYWxob3N0IiwiaGFuZGxlIjoicm9vdCIsImRldmljZUlkIjoiMTA1ZDQxZGQtZDE4OC00YmQzLTlkMzUtNTRmMGU1ZDU4YmE0IiwidXNlcklkIjoidXNlcl8yb21XVkVxVVJQNTRVaUFwQWVTSGl2TzJRWnQiLCJvcmdJZCI6Im9yZ19yeGJjZ2F5YnlzMmltOGMxdTdpaXAiLCJpYXQiOjE3MzA5ODQ2MzQsImV4cCI6MTczMDk5MTgzNCwiYXVkIjoiYXVkaWVuY2UiLCJpc3MiOiJpc3N1ZXIifQ.T_Dp2Kpqw-m9wCkMAHXq0IZGLBGKqhQuUZwgtCNHUaQ" \
  -H "x-challenge-id: 1" \
  -H "x-challenge-answer: 1" \
  http://localhost:8091/users/me)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✓ PASSED${NC} - HTTP $HTTP_CODE"
  # Optionally check response content
  if grep -q "userId" /tmp/test_response_1.txt; then
    echo -e "  ${GREEN}✓ Response contains user data${NC}"
  fi
else
  echo -e "${RED}✗ FAILED${NC} - Expected 200, got $HTTP_CODE"
  echo "Response: $(cat /tmp/test_response_1.txt)"
fi

# Test 2: Invalid challenge  
echo -e "\n2. Testing INVALID challenge (id=1, answer=wrong):"
HTTP_CODE=$(curl -s -o /tmp/test_response_2.txt -w "%{http_code}" \
  -H "Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJvb3RAbG9jYWxob3N0IiwiaGFuZGxlIjoicm9vdCIsImRldmljZUlkIjoiMTA1ZDQxZGQtZDE4OC00YmQzLTlkMzUtNTRmMGU1ZDU4YmE0IiwidXNlcklkIjoidXNlcl8yb21XVkVxVVJQNTRVaUFwQWVTSGl2TzJRWnQiLCJvcmdJZCI6Im9yZ19yeGJjZ2F5YnlzMmltOGMxdTdpaXAiLCJpYXQiOjE3MzA5ODQ2MzQsImV4cCI6MTczMDk5MTgzNCwiYXVkIjoiYXVkaWVuY2UiLCJpc3MiOiJpc3N1ZXIifQ.T_Dp2Kpqw-m9wCkMAHXq0IZGLBGKqhQuUZwgtCNHUaQ" \
  -H "x-challenge-id: 1" \
  -H "x-challenge-answer: wrong" \
  http://localhost:8091/users/me)

if [ "$HTTP_CODE" -eq 403 ]; then
  echo -e "${GREEN}✓ PASSED${NC} - HTTP $HTTP_CODE (correctly rejected)"
  # Check for error message
  if grep -q "invalid challenge answer" /tmp/test_response_2.txt; then
    echo -e "  ${GREEN}✓ Correct error message${NC}"
  fi
else
  echo -e "${RED}✗ FAILED${NC} - Expected 403, got $HTTP_CODE"
  echo "Response: $(cat /tmp/test_response_2.txt)"
fi

# Test 3: Missing challenge headers
echo -e "\n3. Testing MISSING challenge headers:"
HTTP_CODE=$(curl -s -o /tmp/test_response_3.txt -w "%{http_code}" \
  -H "Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJvb3RAbG9jYWxob3N0IiwiaGFuZGxlIjoicm9vdCIsImRldmljZUlkIjoiMTA1ZDQxZGQtZDE4OC00YmQzLTlkMzUtNTRmMGU1ZDU4YmE0IiwidXNlcklkIjoidXNlcl8yb21XVkVxVVJQNTRVaUFwQWVTSGl2TzJRWnQiLCJvcmdJZCI6Im9yZ19yeGJjZ2F5YnlzMmltOGMxdTdpaXAiLCJpYXQiOjE3MzA5ODQ2MzQsImV4cCI6MTczMDk5MTgzNCwiYXVkIjoiYXVkaWVuY2UiLCJpc3MiOiJpc3N1ZXIifQ.T_Dp2Kpqw-m9wCkMAHXq0IZGLBGKqhQuUZwgtCNHUaQ" \
  http://localhost:8091/users/me)

if [ "$HTTP_CODE" -eq 403 ]; then
  echo -e "${GREEN}✓ PASSED${NC} - HTTP $HTTP_CODE (correctly rejected)"
  # Check for error message
  if grep -q "missing challenge headers" /tmp/test_response_3.txt; then
    echo -e "  ${GREEN}✓ Correct error message${NC}"
  fi
else
  echo -e "${RED}✗ FAILED${NC} - Expected 403, got $HTTP_CODE"
  echo "Response: $(cat /tmp/test_response_3.txt)"
fi

# Test 4: Public route (should bypass challenge)
echo -e "\n4. Testing PUBLIC route (no challenge required):"
HTTP_CODE=$(curl -s -o /tmp/test_response_4.txt -w "%{http_code}" \
  http://localhost:8091/health)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✓ PASSED${NC} - HTTP $HTTP_CODE"
  if grep -q "\"status\":\"ok\"" /tmp/test_response_4.txt; then
    echo -e "  ${GREEN}✓ Health check successful${NC}"
  fi
else
  echo -e "${RED}✗ FAILED${NC} - Expected 200, got $HTTP_CODE"
  echo "Response: $(cat /tmp/test_response_4.txt)"
fi

# Summary
echo -e "\n${YELLOW}Test Summary:${NC}"
echo "All tests completed. Check results above for any failures."

# Cleanup
rm -f /tmp/test_response_*.txt

echo -e "\n${GREEN}Done!${NC}"