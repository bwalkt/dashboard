# k6 Performance Tests

This directory contains k6 performance tests written in TypeScript.

## Running Tests

### Option 1: Run All Tests (Docker)

Build and run all tests using Docker:

```bash
docker build -t perf-tests ./perf
docker run --rm perf-tests
```

This will run all test files in the `ts/` directory sequentially.

### Option 2: Run Specific Test (Docker)

To run a specific test, override the CMD with `--entrypoint`:

```bash
docker build -t perf-tests ./perf
docker run --rm --entrypoint k6 perf-tests run /tests/dist/server.test.js
# or
docker run --rm --entrypoint k6 perf-tests run /tests/dist/envoy.test.js
```

### Option 3: Run Multiple Specific Tests

Run multiple specific tests by overriding the entrypoint:

```bash
docker build -t perf-tests ./perf
docker run --rm --entrypoint sh perf-tests -c "k6 run /tests/dist/server.test.js && k6 run /tests/dist/envoy.test.js"
```

### Option 4: Run Locally (if k6 is installed)

First, build the TypeScript files:

```bash
pnpm build
```

Then run tests using k6 directly:

```bash
# Run all tests
k6 run dist/server.test.js && k6 run dist/envoy.test.js

# Run a specific test
k6 run dist/server.test.js
```

## Test Files

- `ts/server.test.ts` - Tests the server API endpoint
- `ts/envoy.test.ts` - Tests the Envoy proxy endpoint

## Adding New Tests

1. Create a new `.test.ts` file in the `ts/` directory
2. Follow the same structure as existing tests
3. The test will automatically be included when running all tests

