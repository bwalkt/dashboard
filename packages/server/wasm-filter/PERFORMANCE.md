# Wasm Filter Performance Guide

## Performance Comparison

| Method | Latency | Throughput | Use Case |
|--------|---------|------------|----------|
| **In-Wasm Logic** | 0.01-0.1ms | 100,000+ RPS | Static validation rules |
| **Redis Lookup** | 1-3ms | 10,000-30,000 RPS | Dynamic allowlists |
| **HTTP to Node.js** | 5-20ms | 1,000-5,000 RPS | Complex business logic |

## Optimization Techniques

### 1. Use Pre-compiled Sets Instead of Arrays
```typescript
// ❌ Slow - O(n) lookup
const valid = ["token1", "token2", "token3"];
if (valid.includes(token)) { }

// ✅ Fast - O(1) lookup
const valid = new Set(["token1", "token2", "token3"]);
if (valid.has(token)) { }
```

### 2. Avoid Regex When Possible
```typescript
// ❌ Slow - regex compilation
if (path.match("^/auth/login")) { }

// ✅ Fast - simple string operation
if (path.startsWith("/auth/login")) { }
```

### 3. Use indexOf Instead of includes for Wasm
```typescript
// ❌ May not be optimized in Wasm
if (cookies.includes("accessToken=")) { }

// ✅ Better performance in Wasm
if (cookies.indexOf("accessToken=") !== -1) { }
```

### 4. Cache Validation Results
If using HTTP calls, implement caching:
```typescript
const cache = new Map<string, boolean>();
const CACHE_TTL = 60000; // 1 minute

function validateWithCache(token: string): boolean {
  const cached = cache.get(token);
  if (cached !== undefined) {
    return cached;
  }
  
  // Perform validation
  const result = performValidation(token);
  cache.set(token, result);
  
  // Clear cache after TTL
  setTimeout(() => cache.delete(token), CACHE_TTL);
  
  return result;
}
```

## Hybrid Approach (Best of Both Worlds)

For maximum performance with flexibility:

1. **Fast path**: Common cases handled in Wasm (90% of requests)
2. **Slow path**: Complex/rare cases via HTTP call (10% of requests)

```typescript
// In Wasm filter
if (isCommonCase(header)) {
  // Handle directly in Wasm (microseconds)
  return validateLocally(header);
} else {
  // Rare case - HTTP call to Node.js (milliseconds)
  return httpCall("validate-complex", header);
}
```

## Benchmarking

Test your filter performance:
```bash
# Using Apache Bench
ab -n 10000 -c 100 -H "x-custom-auth: secret-value-123" http://localhost:8181/

# Using wrk
wrk -t12 -c400 -d30s -H "x-custom-auth: secret-value-123" http://localhost:8181/
```

## Memory Considerations

- Wasm filters have memory limits (typically 256MB)
- Pre-compiled data structures use memory but provide speed
- Balance memory usage vs performance gains

## Recommendations

1. **Start with in-Wasm logic** for all simple validations
2. **Move to Redis** only for data that changes frequently
3. **Use HTTP calls** only for complex business logic that must stay in Node.js
4. **Monitor performance** and adjust based on real traffic patterns