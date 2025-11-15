# Envoy Wasm Header Validator Filter

This WebAssembly filter for Envoy validates custom headers and adds response headers based on validation results.

## Features

- Validates `x-custom-auth` header with expected value `secret-value-123`
- Returns custom response headers when validation passes:
  - `x-auth-validated: true`
  - `x-validation-timestamp: <timestamp>`
- Falls back to JWT cookie authentication if custom header is not present

## Setup

### 1. Build the Wasm Module

```bash
cd wasm-filter
./build.sh
```

### 2. Run with Docker Compose

For development with Wasm filter:
```bash
docker-compose -f docker-compose-wasm.yaml up
```

### 3. Test the Header Validation

Test with valid custom header:
```bash
curl -H "x-custom-auth: secret-value-123" http://localhost:8181/your-endpoint -v
```

Expected response headers:
```
x-auth-validated: true
x-validation-timestamp: <timestamp>
```

Test with invalid/missing header (will check for JWT cookies):
```bash
curl http://localhost:8181/your-endpoint -v
```

## Configuration

The filter configuration is in `envoy-wasm.yaml`. The Wasm filter is configured to:
- Listen on port 8080 (exposed as 8181)
- Forward requests to the backend server on port 8090
- Apply header validation before routing

## Development

To modify the validation logic:
1. Edit `assembly/index.ts`
2. Rebuild with `./build.sh`
3. Restart the Docker containers

## File Structure

```
wasm-filter/
├── assembly/
│   └── index.ts          # Main filter logic
├── build/
│   └── header-validator.wasm  # Compiled Wasm module
├── package.json          # Dependencies
├── asconfig.json        # AssemblyScript config
├── tsconfig.json        # TypeScript config
└── build.sh             # Build script
```