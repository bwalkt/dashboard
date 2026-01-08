#!/bin/bash

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <cookie_file> [base_url]"
  echo "Example: $0 /tmp/cookies.txt http://localhost:8090"
  exit 1
fi

COOKIE_FILE="$1"
BASE_URL="${2:-http://localhost:8090}"

echo "Using base URL: ${BASE_URL}"
echo "Using cookie file: ${COOKIE_FILE}"

echo ""
echo "1) Calling /auth/me to get current challenge..."
ME_RESPONSE=$(curl -s -i -X POST "${BASE_URL}/auth/me" -b "${COOKIE_FILE}")
CHALLENGE_ID=$(echo "${ME_RESPONSE}" | tr -d '\r' | awk '/^[Xx]-[Cc]hallenge-[Ii]d:/{print $2}')

if [ -z "${CHALLENGE_ID}" ]; then
  echo "Failed to extract X-Challenge-Id from /auth/me response."
  exit 1
fi

echo "Challenge ID: ${CHALLENGE_ID}"

echo ""
echo "2) Calling /auth/next/${CHALLENGE_ID} to mark used and fetch next..."
NEXT_RESPONSE=$(curl -s -i -X POST "${BASE_URL}/auth/next/${CHALLENGE_ID}" -b "${COOKIE_FILE}")
NEXT_CHALLENGE_ID=$(echo "${NEXT_RESPONSE}" | tr -d '\r' | awk '/^[Xx]-[Cc]hallenge-[Ii]d:/{print $2}')
NEXT_STATUS=$(echo "${NEXT_RESPONSE}" | awk 'NR==1 {print $2}')

if [ "${NEXT_STATUS}" != "200" ]; then
  echo "Expected 200 from /auth/next, got ${NEXT_STATUS}"
  exit 1
fi

if [ -z "${NEXT_CHALLENGE_ID}" ]; then
  echo "Failed to extract X-Challenge-Id from /auth/next response."
  exit 1
fi

echo "Next Challenge ID: ${NEXT_CHALLENGE_ID}"

echo ""
echo "3) Calling /auth/next/${CHALLENGE_ID} again (should be 409)..."
REPEAT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/auth/next/${CHALLENGE_ID}" -b "${COOKIE_FILE}")

if [ "${REPEAT_STATUS}" != "409" ]; then
  echo "Expected 409 on reuse, got ${REPEAT_STATUS}"
  exit 1
fi

echo "OK: reuse blocked with 409."
echo "Challenge chain test complete."
