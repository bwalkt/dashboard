# ExtAuthZ Challenge-Validation Service

An authorization service that validates challenge/answer header pairs for Envoy proxy requests. This service implements the Envoy ExtAuthZ filter pattern to provide challenge-based authentication.

## Overview

The service provides three main endpoints:

1. **`POST /authz`** - Called by Envoy to validate incoming requests (not public endpoints)
2. **`POST /issue-challenge`** - Used by the application during login to generate a challenge
3. **`POST /refresh-challenge`** - Called when JWT is refreshed to issue a new challenge

## Architecture

- **Fastify** - High-performance web framework
- **Redis** - Challenge storage with TTL
- **TypeScript** - Strict type safety
- **Docker** - Containerized deployment

## Running with Docker Compose

The service is integrated into the main `docker-compose.yml` file. To start all services:

```bash
cd packages/server
docker compose up -d
```

This will start:
- `redis` - Redis 7 instance for challenge storage
- `authz-service` - The authorization service on port 3000
- `pzero-envoy` - Envoy proxy with ExtAuthZ filter configured

## How It Works

### Challenge Mechanism

The challenge is **hash-based** and solved **programmatically by the client** (not by the user). The client computes:
```
SHA256(challengeId + CHALLENGE_SECRET)
```

### 1. Issue a Challenge

During login, your application should call the `/issue-challenge` endpoint:

```bash
curl -X POST http://localhost:3000/issue-challenge
```

Response:
```json
{
  "challengeId": "abc123xyz",
  "challenge": "SHA256(abc123xyz + secret)"
}
```

The challenge is stored in Redis with a configurable TTL (default: 5 minutes).

### 2. Client Solves Challenge Programmatically

The client computes the answer:
```javascript
const crypto = require('crypto');
const challengeId = 'abc123xyz';
const secret = 'your-challenge-secret'; // Must match CHALLENGE_SECRET
const answer = crypto.createHash('sha256')
  .update(challengeId + secret)
  .digest('hex');
```

### 3. Client Request with Challenge

The client must include the challenge headers in **every request** (except public endpoints):

```bash
curl -X GET http://localhost:8181/api/endpoint \
  -H "x-challenge-id: abc123xyz" \
  -H "x-challenge-answer: <computed-hash>"
```

### 4. Envoy Authorization Flow

1. Request arrives at Envoy (port 8181)
2. For non-public endpoints, Envoy calls `POST /authz` on the authz-service
3. Service validates the challenge:
   - Checks for `x-challenge-id` and `x-challenge-answer` headers
   - Looks up expected answer in Redis
   - Compares provided answer with expected answer
   - If valid: returns HTTP 200 (**challenge persists until expired**)
   - If invalid: returns HTTP 403
4. Envoy forwards request to upstream if authorized, or returns 403 if denied

### 5. Refresh Challenge on JWT Refresh

When the JWT token is refreshed, call `/refresh-challenge` to get a new challenge:

```bash
curl -X POST http://localhost:3000/refresh-challenge \
  -H "Content-Type: application/json" \
  -d '{"challengeId": "old-challenge-id"}'
```

Response:
```json
{
  "challengeId": "new-abc123xyz",
  "challenge": "SHA256(new-abc123xyz + secret)"
}
```

**Important**: Challenges are **NOT deleted** after validation. They persist in Redis until they expire (TTL). This allows the same challenge to be used for multiple requests until the JWT is refreshed.

## Example Client Request

```bash
# Step 1: Get a challenge during login
CHALLENGE_RESPONSE=$(curl -s -X POST http://localhost:3000/issue-challenge)
CHALLENGE_ID=$(echo $CHALLENGE_RESPONSE | jq -r '.challengeId')

# Step 2: Client solves challenge programmatically (JavaScript example)
# const answer = crypto.createHash('sha256')
#   .update(challengeId + CHALLENGE_SECRET)
#   .digest('hex');

# Step 3: Make request with challenge headers (reuse same challenge for multiple requests)
curl -X GET http://localhost:8181/api/endpoint \
  -H "x-challenge-id: $CHALLENGE_ID" \
  -H "x-challenge-answer: <computed-hash>"

# Step 4: When JWT refreshes, get new challenge
curl -X POST http://localhost:3000/refresh-challenge \
  -H "Content-Type: application/json" \
  -d "{\"challengeId\": \"$CHALLENGE_ID\"}"
```

## Environment Variables

- `PORT` - Service port (default: 3000)
- `REDIS_URL` - Redis connection URL (default: redis://localhost:6379)
- `CHALLENGE_SECRET` - Secret used for hash computation (default: default-secret-change-in-production)
- `CHALLENGE_TTL` - Challenge TTL in seconds (default: 300 = 5 minutes)

## Health Check

```bash
curl http://localhost:3000/health
```

Returns: `{"status":"ok"}`

## Development

```bash
cd authz-service
npm install
npm run dev
```

## Building

```bash
npm run build
npm start
```

## Challenge Behavior

- **Challenges persist** in Redis until they expire (not deleted after validation)
- **Same challenge** can be used for multiple requests until JWT refresh
- **Challenges are refreshed** when JWT token is refreshed via `/refresh-challenge`
- **Default TTL**: 5 minutes (300 seconds), configurable via `CHALLENGE_TTL`
- **Client-side solving**: Challenges are solved programmatically by computing `SHA256(challengeId + CHALLENGE_SECRET)`

## Error Responses

### Missing Headers
```json
{
  "ok": false,
  "message": "Missing required headers: x-challenge-id and x-challenge-answer"
}
```

### Challenge Not Found/Expired
```json
{
  "ok": false,
  "message": "Challenge not found or expired"
}
```

### Invalid Answer
```json
{
  "ok": false,
  "message": "Invalid challenge answer"
}
```

## Integration with Envoy

The Envoy configuration (`envoy.yaml`) includes:

- **ExtAuthZ filter** - Calls `/authz` before routing
- **authz_cluster** - Service discovery for the authz-service
- **Header forwarding** - Forwards `x-challenge-id`, `x-challenge-answer`, and `authorization` headers

The filter is placed **before** the router filter to ensure all requests are validated.

