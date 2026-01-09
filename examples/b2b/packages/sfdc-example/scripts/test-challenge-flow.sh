#!/bin/bash

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <cookie_file> <proxy_url> [proxy_target] [protected_path]"
  echo "Example: $0 /tmp/cookies.txt http://localhost:8182 pzero-sfdc-server /proxy/salesforce/Order/query/last-30-days"
  exit 1
fi

COOKIE_FILE="$1"
PROXY_URL="$2"
PROXY_TARGET="${3:-pzero-sfdc-server}"
PROTECTED_PATH="${4:-/proxy/salesforce/Order/query/last-30-days}"
if [[ "${PROTECTED_PATH}" != /* ]]; then
  PROTECTED_PATH="/${PROTECTED_PATH}"
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
SHARED_GRID_JS="${ROOT_DIR}/packages/shared/dist/grid/grid.js"
SHARED_CHALLENGE_JS="${ROOT_DIR}/packages/shared/dist/grid/challenge.js"

if [ ! -f "${SHARED_GRID_JS}" ] || [ ! -f "${SHARED_CHALLENGE_JS}" ]; then
  echo "Missing shared build artifacts. Run: pnpm --filter @pzero/shared build"
  exit 1
fi

echo "Proxy URL: ${PROXY_URL}"
echo "Proxy target: ${PROXY_TARGET}"
echo "Cookie file: ${COOKIE_FILE}"
echo "Protected path: ${PROTECTED_PATH}"

echo ""
echo "1) Call /proxy/auth/me to fetch challenge headers..."
HEADERS_FILE="$(mktemp)"
BODY_FILE="$(mktemp)"
curl -s -D "${HEADERS_FILE}" -o "${BODY_FILE}" -X POST "${PROXY_URL}/proxy/auth/me" \
  -H "x-proxy-target: ${PROXY_TARGET}" \
  -b "${COOKIE_FILE}"

CHALLENGE_ID=$(tr -d '\r' < "${HEADERS_FILE}" | awk '/^[Xx]-[Cc]hallenge-[Ii]d:/{print $2}')
CHALLENGE=$(tr -d '\r' < "${HEADERS_FILE}" | awk '/^[Xx]-[Cc]hallenge:/{print substr($0,index($0,$2))}')
CHALLENGE_PARAMS=$(tr -d '\r' < "${HEADERS_FILE}" | awk '/^[Xx]-[Cc]hallenge-[Pp]arams:/{print substr($0,index($0,$2))}')

if [ -z "${CHALLENGE_ID}" ]; then
  echo "Missing x-challenge-id in response."
  rm -f "${HEADERS_FILE}" "${BODY_FILE}"
  exit 1
fi

echo "x-challenge-id: ${CHALLENGE_ID}"
echo "x-challenge: ${CHALLENGE}"
echo "x-challenge-params: ${CHALLENGE_PARAMS}"

echo ""
echo "2) Solve challenge using shared evaluator..."
CHALLENGE_ANSWER="$(CHALLENGE_QUESTION="${CHALLENGE}" CHALLENGE_PARAMS="${CHALLENGE_PARAMS}" BODY_FILE="${BODY_FILE}" SHARED_GRID_JS="${SHARED_GRID_JS}" SHARED_CHALLENGE_JS="${SHARED_CHALLENGE_JS}" node <<'NODE'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

const challenge = process.env.CHALLENGE_QUESTION || ''
const params = process.env.CHALLENGE_PARAMS || ''
const bodyPath = process.env.BODY_FILE || ''
const gridPath = process.env.SHARED_GRID_JS || ''
const challengePath = process.env.SHARED_CHALLENGE_JS || ''

const body = JSON.parse(fs.readFileSync(bodyPath, 'utf8'))
const grid = body?.user?.data?.grid
if (!Array.isArray(grid)) {
  console.error('Missing user.data.grid in /auth/me response')
  process.exit(1)
}

const { evalFuncAsJSON } = await import(pathToFileURL(gridPath).href)
const { parseChallengeParams } = await import(pathToFileURL(challengePath).href)
const parsed = parseChallengeParams(params)
const result = evalFuncAsJSON({
  expression: challenge,
  parameters: { x: parsed.x, y: parsed.y },
  id: 'challenge',
  grid,
})

if (result?.result?.value === null || result?.result?.value === undefined) {
  console.error('Challenge evaluation failed')
  process.exit(1)
}

process.stdout.write(String(result.result.value))
NODE
)"

if [ -z "${CHALLENGE_ANSWER}" ]; then
  echo "Failed to compute challenge answer."
  rm -f "${HEADERS_FILE}" "${BODY_FILE}"
  exit 1
fi

echo "x-challenge-answer: ${CHALLENGE_ANSWER}"

echo ""
echo "3) Call protected endpoint with challenge headers..."
curl -s -i -X GET "${PROXY_URL}${PROTECTED_PATH}" \
  -H "x-proxy-target: ${PROXY_TARGET}" \
  -H "x-challenge-id: ${CHALLENGE_ID}" \
  -H "x-challenge-answer: ${CHALLENGE_ANSWER}" \
  -b "${COOKIE_FILE}"

rm -f "${HEADERS_FILE}" "${BODY_FILE}"

echo ""
echo "Done."
