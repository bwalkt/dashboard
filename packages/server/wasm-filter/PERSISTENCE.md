# Wasm Filter Persistence in Envoy

## What Persists

✅ **Persists Across Requests:**
- Global variables
- Static Maps/Sets
- Class static properties
- Root context state
- Any data stored outside request handlers

✅ **Lifetime:**
- Data persists as long as the Envoy worker thread lives
- Typically until Envoy restarts or reloads config
- Can be hours, days, or weeks

## What Doesn't Persist

❌ **Lost Between Requests:**
- Local variables in request handlers
- Per-request context state (unless stored globally)

❌ **Lost on Envoy Restart:**
- All in-memory data
- No disk persistence

## Important Considerations

### 1. Thread Safety
- Each Envoy worker thread has its own Wasm instance
- State is NOT shared between worker threads
- If Envoy has 4 workers, you have 4 separate caches

### 2. Memory Limits
- Wasm filters have memory limits (typically 256MB)
- Implement cleanup strategies:
  - LRU eviction
  - TTL expiration
  - Maximum size limits

### 3. Consistency
- State may differ between worker threads
- Not suitable for strong consistency requirements
- Good for caching, rate limiting, statistics

## Use Cases for Persistence

### ✅ Perfect For:
- **Token/Auth Caching**: Cache validation results
- **Rate Limiting**: Track requests per IP/user
- **Statistics**: Count requests, errors, latency
- **Blacklists/Whitelists**: Dynamic access control
- **Session Tracking**: Light session state
- **Circuit Breaking**: Track service health

### ❌ Not Suitable For:
- **Critical Data**: Use a database
- **Large Datasets**: Memory constraints
- **Shared State**: Each worker isolated
- **Long-term Storage**: Lost on restart

## Example: Building a Learning System

```typescript
// This cache learns from successful authentications
const learnedTokens = new Map<string, i32>();

function onSuccessfulAuth(token: string): void {
  const score = learnedTokens.get(token) || 0;
  learnedTokens.set(token, score + 1);
  
  // After 10 successful uses, auto-whitelist
  if (score > 10) {
    trustedTokens.add(token);
  }
}
```

## Memory Management Strategy

```typescript
class PersistentCache {
  private maxSize: i32 = 10000;
  private data: Map<string, string> = new Map();
  
  set(key: string, value: string): void {
    // Prevent unbounded growth
    if (this.data.size >= this.maxSize) {
      // Remove oldest 10%
      const toRemove = this.maxSize / 10;
      let removed = 0;
      this.data.forEach((_, k) => {
        if (removed++ < toRemove) {
          this.data.delete(k);
        }
      });
    }
    
    this.data.set(key, value);
  }
}
```

## Testing Persistence

```bash
# First request - cache miss
curl -H "x-custom-auth: test-token-123" http://localhost:8181/api
# Response: Validates and caches

# Second request - cache hit (faster)
curl -H "x-custom-auth: test-token-123" http://localhost:8181/api
# Response: Uses cached result

# Check statistics
curl http://localhost:9901/stats/prometheus | grep wasm
```

## Best Practices

1. **Always implement cleanup**: Prevent memory leaks
2. **Use TTLs**: Expire old data
3. **Monitor memory**: Track cache sizes
4. **Plan for restarts**: Don't rely on persistence for critical data
5. **Test with multiple workers**: Ensure logic works with isolated state
6. **Log statistics**: Track cache hit rates

## Configuration

In `envoy.yaml`, configure worker threads:
```yaml
# Single thread for consistent cache (slower)
--concurrency 1

# Multiple threads for performance (separate caches)
--concurrency 4
```

## Alternative: Shared State

If you need shared state across workers:
1. Use external store (Redis)
2. Use Envoy's shared memory (C++ filters only)
3. Use singleton upstream with session affinity