/// <reference path="./types.d.ts" />
import { RootContext, Context, registerRootContext, FilterHeadersStatusValues, stream_context, send_local_response } from "@solo-io/proxy-runtime/assembly";

// Simple in-memory cache (Redis-like functionality)
class Cache {
  private data: Map<string, string> = new Map();
  private expiry: Map<string, i64> = new Map();
  
  set(key: string, value: string, ttlMs: i64 = 0): void {
    this.data.set(key, value);
    if (ttlMs > 0) {
      this.expiry.set(key, Date.now() + ttlMs);
    }
  }
  
  get(key: string): string | null {
    const expiryTime = this.expiry.get(key);
    if (expiryTime && Date.now() > expiryTime) {
      // Expired - remove from cache
      this.data.delete(key);
      this.expiry.delete(key);
      return null;
    }
    
    return this.data.get(key) || null;
  }
  
  exists(key: string): boolean {
    const value = this.get(key);
    return value !== null;
  }
  
  delete(key: string): void {
    this.data.delete(key);
    this.expiry.delete(key);
  }
  
  // LRU-style cleanup if memory gets too large
  cleanup(): void {
    if (this.data.size > 10000) { // Max 10k entries
      // Remove expired entries first
      const now = Date.now();
      const keysToDelete: string[] = [];
      
      this.expiry.forEach((expiry, key) => {
        if (now > expiry) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => {
        this.data.delete(key);
        this.expiry.delete(key);
      });
      
      // If still too large, remove oldest entries
      if (this.data.size > 10000) {
        let removed = 0;
        this.data.forEach((_, key) => {
          if (removed++ < 1000) {
            this.data.delete(key);
            this.expiry.delete(key);
          }
        });
      }
    }
  }
}

// Global cache instance (persists across requests)
const cache = new Cache();

// Pre-populate with valid tokens (optional)
cache.set("auth:secret-value-123", "valid", 3600000); // 1 hour TTL
cache.set("auth:another-token", "valid", 3600000);

class HeaderValidatorRoot extends RootContext {
  createContext(context_id: i32): Context {
    return new HeaderValidatorContext(context_id, this);
  }
  
  onTick(): void {
    // Called periodically - use for cache cleanup
    cache.cleanup();
  }
}

class HeaderValidatorContext extends Context {
  constructor(context_id: i32, root_context: HeaderValidatorRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(a: i32, end_of_stream: boolean): FilterHeadersStatusValues {
    if (!end_of_stream) {
      return FilterHeadersStatusValues.Continue;
    }
    
    const customHeader = stream_context.headers.request.get("x-custom-auth");
    
    if (customHeader) {
      // Check in-memory cache (microsecond latency)
      const cacheKey = `auth:${customHeader}`;
      const cachedValue = cache.get(cacheKey);
      
      if (cachedValue === "valid") {
        stream_context.headers.request.add("x-validation-status", "authenticated");
        
        // Optional: Track usage
        const usageKey = `usage:${customHeader}`;
        const usage = cache.get(usageKey) || "0";
        cache.set(usageKey, (parseInt(usage) + 1).toString(), 60000); // 1 minute TTL
        
        return FilterHeadersStatusValues.Continue;
      } else if (cachedValue === "invalid") {
        // Cached invalid result
        send_local_response(401, "", '{"error":"Invalid token"}', [], -1);
        return FilterHeadersStatusValues.StopIteration;
      }
      
      // Not in cache - you could:
      // 1. Default to invalid
      // 2. Make an HTTP call to validate and cache result
      // 3. Allow through and let backend validate
      
      // For now, cache as invalid
      cache.set(cacheKey, "invalid", 60000); // Cache for 1 minute
      send_local_response(401, "", '{"error":"Token not recognized"}', [], -1);
      return FilterHeadersStatusValues.StopIteration;
    }
    
    // Check for JWT cookies as fallback
    const cookies = stream_context.headers.request.get("cookie");
    if (cookies && (cookies.indexOf("accessToken=") !== -1 || cookies.indexOf("refreshToken=") !== -1)) {
      return FilterHeadersStatusValues.Continue;
    }
    
    send_local_response(401, "", '{"error":"Authentication required"}', [], -1);
    return FilterHeadersStatusValues.StopIteration;
  }

  onResponseHeaders(a: i32, end_of_stream: boolean): FilterHeadersStatusValues {
    if (!end_of_stream) {
      return FilterHeadersStatusValues.Continue;
    }
    
    const validationStatus = stream_context.headers.request.get("x-validation-status");
    
    if (validationStatus === "authenticated") {
      stream_context.headers.response.add("x-auth-validated", "true");
      stream_context.headers.response.add("x-validation-timestamp", "validated");
    }
    
    return FilterHeadersStatusValues.Continue;
  }
}

registerRootContext((context_id: i32) => { return new HeaderValidatorRoot(context_id); });