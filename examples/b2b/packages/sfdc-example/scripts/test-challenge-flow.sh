#!/bin/bash

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <cookie_file> <proxy_url> [proxy_target]"
  echo "Example: $0 /tmp/cookies.txt http://localhost:8182 pzero-sfdc-server"
  exit 1
fi

COOKIE_FILE="$1"
PROXY_URL="$2"
PROXY_TARGET="${3:-pzero-sfdc-server}"

echo "Proxy URL: ${PROXY_URL}"
echo "Proxy target: ${PROXY_TARGET}"
echo "Cookie file: ${COOKIE_FILE}"

echo ""
echo "1) Call /proxy/auth/me to fetch challenge headers..."
ME_RESPONSE=$(curl -s -i -X POST "${PROXY_URL}/proxy/auth/me" \
  -H "x-proxy-target: ${PROXY_TARGET}" \
  -b "${COOKIE_FILE}")

CHALLENGE_ID=$(echo "${ME_RESPONSE}" | tr -d '\r' | awk '/^[Xx]-[Cc]hallenge-[Ii]d:/{print $2}')
CHALLENGE=$(echo "${ME_RESPONSE}" | tr -d '\r' | awk '/^[Xx]-[Cc]hallenge:/{print substr($0,index($0,$2))}')
CHALLENGE_PARAMS=$(echo "${ME_RESPONSE}" | tr -d '\r' | awk '/^[Xx]-[Cc]hallenge-[Pp]arams:/{print substr($0,index($0,$2))}')

if [ -z "${CHALLENGE_ID}" ]; then
  echo "Missing x-challenge-id in response."
  exit 1
fi

echo "x-challenge-id: ${CHALLENGE_ID}"
echo "x-challenge: ${CHALLENGE}"
echo "x-challenge-params: ${CHALLENGE_PARAMS}"

echo ""
echo "2) Use the app client to solve and attach challenge headers for protected requests."
echo "   The sfdc-example client should now add x-challenge-id and x-challenge-answer automatically."
echo ""
echo "Done."
