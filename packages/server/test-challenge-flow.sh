#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Challenge-Response Authentication Flow${NC}"
echo "================================================"

# Test configuration
PROXY_URL="http://localhost:8182"
TIMESTAMP=$(date +%s)
EMAIL="test${TIMESTAMP}@example.com"
PASSWORD="password123"
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
COOKIE_FILE="/tmp/cookies_${TIMESTAMP}.txt"

echo -e "\n${YELLOW}Step 1: Register new user${NC}"
echo "Email: $EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST ${PROXY_URL}/auth/register \
  -H "Content-Type: application/json" \
  -H "User-Agent: ${USER_AGENT}" \
  -d "{
    \"name\": \"Test User\",
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }")

echo "Response: ${REGISTER_RESPONSE}"

# Get verification code from Redis
echo -e "\n${YELLOW}Step 2: Get verification code from Redis${NC}"
CODE=$(docker exec pzero-dragonfly redis-cli GET "email_registration:${EMAIL}" | jq -r .code)
echo "Verification code: $CODE"

echo -e "\n${YELLOW}Step 3: Verify registration${NC}"
VERIFY_RESPONSE=$(curl -s -X POST ${PROXY_URL}/auth/register/verify \
  -H "Content-Type: application/json" \
  -H "User-Agent: ${USER_AGENT}" \
  -c ${COOKIE_FILE} \
  -d "{
    \"email\": \"${EMAIL}\",
    \"code\": \"${CODE}\",
    \"password\": \"${PASSWORD}\"
  }")

USER_ID=$(echo "${VERIFY_RESPONSE}" | jq -r .user.id)
echo "User created with ID: ${USER_ID}"

echo -e "\n${YELLOW}Step 4: Call /auth/me to get challenge${NC}"
ME_RESPONSE=$(curl -s -i -X GET ${PROXY_URL}/auth/me \
  -H "User-Agent: ${USER_AGENT}" \
  -b ${COOKIE_FILE})

# Extract headers and body
CHALLENGE_ID=$(echo "${ME_RESPONSE}" | grep -i "x-challenge-id:" | cut -d' ' -f2 | tr -d '\r')
CHALLENGE_QUESTION=$(echo "${ME_RESPONSE}" | grep -i "x-challenge-question:" | cut -d' ' -f2- | tr -d '\r')
CHALLENGE_PARAMS=$(echo "${ME_RESPONSE}" | grep -i "x-challenge-params:" | cut -d' ' -f2- | tr -d '\r')

echo "Challenge ID: ${CHALLENGE_ID}"
echo "Challenge Question: ${CHALLENGE_QUESTION}"
echo "Challenge Params: ${CHALLENGE_PARAMS}"

# Extract grid from response body
GRID=$(echo "${ME_RESPONSE}" | tail -1 | jq -r .user.grid)
echo "Grid received: $(echo ${GRID} | jq -c .)"

echo -e "\n${YELLOW}Step 5: Test protected endpoint WITHOUT challenge headers${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET ${PROXY_URL}/users \
  -H "User-Agent: ${USER_AGENT}" \
  -b ${COOKIE_FILE})

if [ "$RESPONSE" = "403" ]; then
  echo -e "${GREEN}✓ Correctly blocked request without challenge headers (403)${NC}"
else
  echo -e "${RED}✗ Expected 403, got ${RESPONSE}${NC}"
fi

echo -e "\n${YELLOW}Step 6: Solve challenge using Node.js${NC}"
# Create a temporary Node.js script to solve the challenge
cat > /tmp/solve_challenge_${TIMESTAMP}.mjs << 'EOF'
import { evalFuncAsJSON } from '@pzero/shared/grid';

const args = process.argv.slice(2);
const grid = JSON.parse(args[0]);
const expression = args[1];
const params = JSON.parse(args[2]);

// Parse params from "x=row,col,y=row,col" format
const paramObj = {};
params.split(',').forEach(p => {
  if (p.includes('=')) {
    const [key, value] = p.split('=');
    if (key === 'x' || key === 'y') {
      paramObj[key] = value;
    }
  }
});

const result = evalFuncAsJSON({
  expression: expression,
  parameters: paramObj,
  id: 'test',
  grid: grid
});

console.log(result.result.value);
EOF

# Solve the challenge
cd /Users/umam3/projects/boardwalk/p-zero/dashboard/packages/server
ANSWER=$(node /tmp/solve_challenge_${TIMESTAMP}.mjs "${GRID}" "${CHALLENGE_QUESTION}" "{\"x\":\"${CHALLENGE_PARAMS}\"}")
echo "Calculated answer: ${ANSWER}"

echo -e "\n${YELLOW}Step 7: Test protected endpoint WITH challenge headers${NC}"
RESPONSE_WITH_CHALLENGE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET ${PROXY_URL}/users \
  -H "User-Agent: ${USER_AGENT}" \
  -H "x-challenge-id: ${CHALLENGE_ID}" \
  -H "x-challenge-answer: ${ANSWER}" \
  -b ${COOKIE_FILE})

HTTP_CODE=$(echo "${RESPONSE_WITH_CHALLENGE}" | grep "HTTP_CODE:" | cut -d':' -f2)
RESPONSE_BODY=$(echo "${RESPONSE_WITH_CHALLENGE}" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Successfully accessed protected endpoint with challenge headers (200)${NC}"
  echo "Response: ${RESPONSE_BODY}"
else
  echo -e "${RED}✗ Failed to access protected endpoint. HTTP Code: ${HTTP_CODE}${NC}"
  echo "Response: ${RESPONSE_BODY}"
fi

# Cleanup
rm -f ${COOKIE_FILE} /tmp/solve_challenge_${TIMESTAMP}.mjs

echo -e "\n${GREEN}Challenge-Response Flow Test Complete!${NC}"