# k6 Performance Tests

This directory contains k6 performance tests written in TypeScript.

## Running Tests

### Option 1: Run All Tests (Docker)

Build and run all tests using Docker:

```bash
docker build -t perf-tests ./perf
docker run --rm \
  -e AUTH_TOKEN=your_jwt_token_here \
  -e PROXY_TARGET=http://pzero-sfdc-server:3000 \
  -e BASE_URL=https://pzero-envoy.incmix.com/proxy \
  perf-tests
```

This will run all test files in the `ts/` directory sequentially.

### Option 2: Run Specific Test (Docker)

To run a specific test, override the CMD with `--entrypoint`:

```bash
docker build -t perf-tests ./perf
docker run --rm \
  -e AUTH_TOKEN=your_jwt_token_here \
  --entrypoint k6 \
  perf-tests run /tests/dist/server.test.js
# or
docker run --rm \
  -e AUTH_TOKEN=your_jwt_token_here \
  --entrypoint k6 \
  perf-tests run /tests/dist/envoy.test.js
```

### Option 3: Run Multiple Specific Tests

Run multiple specific tests by overriding the entrypoint:

```bash
docker build -t perf-tests ./perf
docker run --rm \
  -e AUTH_TOKEN=your_jwt_token_here \
  --entrypoint sh \
  perf-tests -c "k6 run /tests/dist/server.test.js && k6 run /tests/dist/envoy.test.js"
```

### Option 4: Run Locally (if k6 is installed)

First, build the TypeScript files:

```bash
pnpm build
```

Then run tests using k6 directly with environment variables:

```bash
# Run all tests
k6 run --env AUTH_TOKEN=your_token dist/server.test.js && \
k6 run --env AUTH_TOKEN=your_token dist/envoy.test.js

# Run a specific test
k6 run --env AUTH_TOKEN=your_token dist/server.test.js
```

## Test Files

- `ts/server.test.ts` - Tests the server API endpoint
- `ts/envoy.test.ts` - Tests the Envoy proxy endpoint
- `ts/sfdc-server-vanilla.test.ts` - Main test file for sfdc-server-vanilla GET endpoints
- `ts/sfdc-server-vanilla.load.test.ts` - Load test scenario (gradual ramp-up)
- `ts/sfdc-server-vanilla.stress.test.ts` - Stress test scenario (high sustained load)
- `ts/sfdc-server-vanilla.spike.test.ts` - Spike test scenario (sudden load increase)
- `ts/sfdc-server-vanilla.smoke.test.ts` - Smoke test scenario (quick verification)

## sfdc-server-vanilla Tests

The sfdc-server-vanilla tests cover all GET endpoints (except login) with proper authentication and challenge handling.

### Environment Variables Required

- `AUTH_TOKEN` - JWT token for authentication (required)
- `PROXY_TARGET` - Proxy target URL (default: `http://pzero-sfdc-server:3000`)
- `BASE_URL` - Base API URL (default: `https://pzero-envoy.incmix.com/proxy`)

### Challenge-related environment variables

Tests send a **static secret string** as `x-challenge-answer` (no grid-based solving). Align these with your backend/Redis so the proxy accepts the challenge.

- `STATIC_CHALLENGE_ANSWER` - Static string sent as `x-challenge-answer`. Default: `static-secret`. Must match the value accepted by the backend/Redis for the challenge ID in use (e.g. Redis key `challenge:<id>` stores the expected answer; see `packages/server/scripts/init-redis.js` and WASM filter config).
- `STATIC_CHALLENGE_ID` - When the server does not return challenge IDs, set this so tests still send challenge headers. Ensure Redis/backend has this id mapped to `STATIC_CHALLENGE_ANSWER` (e.g. via init-redis or WASM filter).

### Setting Environment Variables

#### Option 1: Command-line arguments (recommended for local testing)

```bash
# Build TypeScript
pnpm build

# Run main test with environment variables
k6 run --env AUTH_TOKEN=your_jwt_token_here \
       --env PROXY_TARGET=http://pzero-sfdc-server:3000 \
       --env BASE_URL=https://pzero-envoy.incmix.com/proxy \
       dist/sfdc-server-vanilla.test.js
```

#### Option 2: System environment variables

```bash
# Export environment variables
export AUTH_TOKEN=your_jwt_token_here
export PROXY_TARGET=http://pzero-sfdc-server:3000
export BASE_URL=https://pzero-envoy.incmix.com/proxy

# Build and run
pnpm build
k6 run dist/sfdc-server-vanilla.test.js
```

#### Option 3: Using a .env file (create one in perf directory)

Create `perf/.env`:
```bash
AUTH_TOKEN=your_jwt_token_here
PROXY_TARGET=http://pzero-sfdc-server:3000
BASE_URL=https://pzero-envoy.incmix.com/proxy
```

Then load it before running:
```bash
# Load .env file and run (requires source command or env loading tool)
set -a && source .env && set +a && k6 run dist/sfdc-server-vanilla.test.js

# Or with Docker using --env-file
docker run --rm --env-file perf/.env perf-tests
```

**Note:** Make sure to add `.env` to `.gitignore` to avoid committing sensitive tokens. (Already configured in root `.gitignore`)

#### Option 4: Docker with environment variables

```bash
# Build the Docker image
docker build -t perf-tests ./perf

# Run with environment variables
docker run --rm \
  -e AUTH_TOKEN=your_jwt_token_here \
  -e PROXY_TARGET=http://pzero-sfdc-server:3000 \
  -e BASE_URL=https://pzero-envoy.incmix.com/proxy \
  perf-tests

# Or use --env-file for multiple variables
docker run --rm --env-file perf/.env perf-tests

# Or run a specific test
docker run --rm \
  -e AUTH_TOKEN=your_jwt_token_here \
  --entrypoint k6 \
  perf-tests run /tests/dist/sfdc-server-vanilla.test.js
```

### Running sfdc-server-vanilla Tests

```bash
# Build TypeScript
pnpm build

# Run main test (with environment variables)
k6 run --env AUTH_TOKEN=your_token dist/sfdc-server-vanilla.test.js

# Run load test
k6 run --env AUTH_TOKEN=your_token dist/sfdc-server-vanilla.load.test.js

# Run stress test
k6 run --env AUTH_TOKEN=your_token dist/sfdc-server-vanilla.stress.test.js

# Run spike test
k6 run --env AUTH_TOKEN=your_token dist/sfdc-server-vanilla.spike.test.js

# Run smoke test
k6 run --env AUTH_TOKEN=your_token dist/sfdc-server-vanilla.smoke.test.js
```

### Tested Endpoints

- `GET /salesforce/:objectType/query` - Query Salesforce records (Order, Product2, PricebookEntry, OrderItem)
- `GET /salesforce/Order/query/last-30-days` - Query orders from last 30 days
- `GET /salesforce/records/:objectType/:recordId` - Get specific record by ID
- `GET /salesforce/metadata/:objectType` - Get object metadata

### Features

- Automatic challenge header handling (static answer via `STATIC_CHALLENGE_ANSWER`; see above)
- Warm-up via `/auth/me` to collect challenge IDs when the server returns them
- Proxy behavior with `x-proxy-target` header
- Multiple test scenarios (load, stress, spike, smoke)
- Custom metrics and thresholds

## Adding New Tests

1. Create a new `.test.ts` file in the `ts/` directory
2. Follow the same structure as existing tests
3. The test will automatically be included when running all tests

