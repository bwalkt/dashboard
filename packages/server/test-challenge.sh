#!/bin/bash

# Test challenge-response flow

echo "Testing challenge-response authentication flow..."

# 1. First call to /auth/me to get challenge headers
echo -e "\n1. Calling /auth/me to get challenge..."
response=$(curl -i -s -X GET http://localhost:8090/auth/me \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=test")

echo "$response" | grep -i "x-challenge"

# Extract headers
challenge_id=$(echo "$response" | grep -i "x-challenge-id:" | sed 's/.*: //' | tr -d '\r')
challenge_question=$(echo "$response" | grep -i "x-challenge-question:" | sed 's/.*: //' | tr -d '\r')
challenge_params=$(echo "$response" | grep -i "x-challenge-params:" | sed 's/.*: //' | tr -d '\r')

echo "Challenge ID: $challenge_id"
echo "Challenge Question: $challenge_question"
echo "Challenge Params: $challenge_params"

# 2. Second call with challenge answer (would be calculated by client)
echo -e "\n2. Calling /auth/me with challenge answer..."
# For testing, use a dummy answer
curl -i -X GET http://localhost:8090/auth/me \
  -H "Content-Type: application/json" \
  -H "X-Challenge-Id: $challenge_id" \
  -H "X-Challenge-Answer: 42" \
  -H "Cookie: accessToken=test"

echo -e "\nChallenge-response test complete."