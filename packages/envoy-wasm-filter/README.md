# Envoy WASM Filter

A Go-based Envoy WASM filter that validates challenge headers (`x-challenge-id` and `x-challenge-answer`) using Envoy's shared data cache with Redis fallback via async HTTP calls to the authz-service.

## Prerequisites

- Go 1.21 or later
- TinyGo (for WASM compilation)
  - Install: `brew install tinygo` (macOS) or download from [tinygo.org](https://tinygo.org/getting-started/install/)

## Building

Install Go dependencies and build the filter:

```bash
cd packages/envoy-wasm-filter
make build
```

This will compile the Go code to `build/filter.wasm` using TinyGo.

## Development

The filter is written in Go using the [proxy-wasm-go-sdk](https://github.com/tetratelabs/proxy-wasm-go-sdk).

## Usage

The compiled WASM file is mounted into the Envoy container at `/etc/envoy/wasm/challenge-authz.wasm` and configured in `packages/server/envoy-wasm.yaml`.

The WASM filter runs in a separate Envoy container (`pzero-envoy-wasm`) on port 8182 (external) → 8081 (internal).

## Filter Behavior

1. **Public Routes**: Bypasses validation for public routes:
   - `/health`
   - `/auth/*`
   - `/centrifugo/*`
   - `/sms/*`
   - `/email/*`
   - `/proxy/auth/login`
   - `/proxy/auth/callback`
   - `/assets/*`
   - OPTIONS requests (CORS preflight)

2. **Protected Routes**: Requires `x-challenge-id` and `x-challenge-answer` headers:
   - First checks Envoy shared data cache (fast in-memory lookup)
   - If cache miss, makes async HTTP call to `authz-service:3000/validate`
   - Caches successful validations in shared data with TTL (3600s default)
   - Returns 403 if validation fails

## Testing

### Quick Test

Run a simple smoke test:

```bash
./quick-test.sh
```

This tests:
- Public route bypass
- Protected route rejection without challenge
- Valid challenge acceptance
- Invalid challenge rejection

### Full Test Suite

Run comprehensive tests:

```bash
./test-filter.sh
```

This tests:
- Public route bypass for all public routes
- Protected routes without challenge headers
- Invalid challenge scenarios
- Valid challenge validation (cache miss and cache hit)
- Direct `/validate` endpoint testing
- Error cases

### Environment Variables

You can customize the test URLs:

```bash
ENVOY_WASM_URL=http://localhost:8182 \
AUTHZ_SERVICE_URL=http://localhost:3002 \
CHALLENGE_SECRET=your-secret \
./test-filter.sh
```

## Architecture

- **Shared Data Cache**: Fast in-memory lookups using Envoy's shared data (per-worker)
- **HTTP Fallback**: Async calls to authz-service when cache misses
- **TTL**: 3600 seconds (1 hour) matching Redis TTL
- **Async Processing**: Non-blocking HTTP calls using `DispatchHttpCall`

