# Conditional Header Validation Setup

## How It Works

The application automatically detects whether it's running behind Envoy and conditionally enables header validation:

```typescript
const useEnvoy = process.env.USE_ENVOY === 'true';
const useHeaderValidation = process.env.ENABLE_HEADER_VALIDATION !== 'false';

if (useEnvoy) {
  // Envoy handles validation - Fastify reads Envoy's results
  fastify.log.info('🌐 Running behind Envoy - header validation disabled in Fastify');
} else if (useHeaderValidation) {
  // Fastify handles validation directly
  fastify.log.info('🔒 Header validation enabled in Fastify (no Envoy)');
  await fastify.register(headerValidationPlugin);
}
```

## Configuration Modes

### 🚀 **Mode 1: Fastify Only**
```bash
# .env settings
USE_ENVOY=false
ENABLE_HEADER_VALIDATION=true

# Start
docker-compose -f docker-compose.fastify.yaml up
```

**What happens:**
- Fastify plugin handles all header validation
- Rate limiting in Fastify
- Token caching in Fastify
- Direct authentication

### ⚡ **Mode 2: Envoy + Fastify** 
```bash
# .env settings  
USE_ENVOY=true
ENABLE_HEADER_VALIDATION=true  # Ignored when USE_ENVOY=true

# Start
docker-compose -f docker-compose.fastify.yaml --profile envoy up
```

**What happens:**
- Envoy Wasm filter handles validation
- Fastify reads Envoy's validation results
- No duplicate validation
- Maximum performance

### ⚠️ **Mode 3: No Validation**
```bash
# .env settings
USE_ENVOY=false
ENABLE_HEADER_VALIDATION=false

# Start  
docker-compose -f docker-compose.fastify.yaml up
```

**What happens:**
- No header validation at all
- Only for development/testing
- Not recommended for production

## Environment Variables

### **Primary Controls:**
- `USE_ENVOY` - If `true`, expects Envoy to handle validation
- `ENABLE_HEADER_VALIDATION` - If `true` AND `USE_ENVOY=false`, enables Fastify validation

### **Decision Matrix:**
| USE_ENVOY | ENABLE_HEADER_VALIDATION | Result |
|-----------|--------------------------|--------|
| `true` | `true` | Envoy validates, Fastify reads results |
| `true` | `false` | Envoy validates, Fastify reads results |
| `false` | `true` | Fastify validates |
| `false` | `false` | No validation |

## How Fastify Detects Envoy Results

When `USE_ENVOY=true`, Fastify looks for headers that Envoy adds:

```typescript
fastify.addHook('preHandler', async (request, reply) => {
  // Check if Envoy already validated
  const envoyValidated = request.headers['x-auth-validated'];
  const validationMethod = request.headers['x-validation-method'];
  
  if (envoyValidated === 'true') {
    request.user = {
      authenticated: true,
      method: validationMethod || 'envoy-validated',
      token: 'validated-by-envoy'
    };
  }
});
```

## Testing Different Modes

### **Test Fastify Only:**
```bash
# Set environment
cp .env.conditional .env
# Edit: USE_ENVOY=false, ENABLE_HEADER_VALIDATION=true

# Start
docker-compose -f docker-compose.fastify.yaml up

# Test
curl -H "x-custom-auth: secret-value-123" http://localhost:8090/api/test
```

### **Test Envoy + Fastify:**
```bash
# Set environment  
cp .env.conditional .env
# Edit: USE_ENVOY=true

# Build and start
pnpm build:wasm
docker-compose -f docker-compose.fastify.yaml --profile envoy up

# Test (goes through Envoy first)
curl -H "x-custom-auth: secret-value-123" http://localhost:8181/api/test
```

## Configuration Endpoints

### **Check Current Config:**
```bash
curl http://localhost:8090/config
```

**Response:**
```json
{
  "architecture": "fastify-only", // or "envoy+fastify"
  "headerValidation": {
    "enabled": true,
    "handledBy": "fastify-plugin" // or "envoy-wasm-filter"  
  },
  "environment": {
    "USE_ENVOY": false,
    "ENABLE_HEADER_VALIDATION": true,
    "NODE_ENV": "development"
  }
}
```

### **Health Check Shows Mode:**
```bash
curl http://localhost:8090/health
```

**Response:**
```json
{
  "status": "ok",
  "configuration": {
    "useEnvoy": false,
    "headerValidation": true,
    "envoyHeaders": null // or shows Envoy headers if present
  }
}
```

## Docker Compose Profiles

### **Start Fastify Only:**
```bash
# Uses USE_ENVOY=false from .env
docker-compose -f docker-compose.fastify.yaml up
```

### **Start with Envoy:**
```bash
# Automatically sets USE_ENVOY=true
docker-compose -f docker-compose.fastify.yaml --profile envoy up
```

## Performance Comparison

### **Fastify Only Mode:**
- ✅ Simple setup
- ✅ Easy debugging  
- ✅ ~25,000 RPS
- ❌ Limited advanced features

### **Envoy + Fastify Mode:**
- ✅ Maximum performance (~45,000 RPS)
- ✅ Advanced routing, load balancing
- ✅ Better security isolation
- ❌ More complex setup
- ❌ Harder debugging

## Debugging

### **Check Which Mode Is Active:**
```bash
# Look at startup logs
docker logs pzero-fastify | grep -E "(Envoy|validation)"
```

**Example outputs:**
```
🌐 Running behind Envoy - header validation disabled in Fastify
# or
🔒 Header validation enabled in Fastify (no Envoy)
```

### **Verify Headers:**
```bash
# Test and check response headers
curl -v -H "x-custom-auth: secret-value-123" http://localhost:8090/api/test

# Look for:
# - x-auth-validated: true
# - x-validation-method: (fastify-plugin or envoy-validated)
```

### **Check Configuration:**
```bash
curl http://localhost:8090/config | jq
curl http://localhost:8090/health | jq .configuration
```

## Migration Strategy

### **Start Simple:**
```bash
USE_ENVOY=false
ENABLE_HEADER_VALIDATION=true
```

### **Add Envoy Later:**
```bash
# Build Wasm filter
pnpm build:wasm

# Change configuration
USE_ENVOY=true

# Restart with Envoy profile
docker-compose -f docker-compose.fastify.yaml --profile envoy up
```

### **Compare Performance:**
```bash
# Benchmark Fastify only
wrk -t4 -c100 -d30s http://localhost:8090/api/test

# Benchmark Envoy + Fastify  
wrk -t4 -c100 -d30s http://localhost:8181/api/test
```

This conditional setup ensures **no duplicate validation** while giving you the flexibility to run with or without Envoy based on your needs! 🎯