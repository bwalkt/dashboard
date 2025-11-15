/// <reference path="./types.d.ts" />
import { RootContext, Context, registerRootContext, FilterHeadersStatusValues, stream_context, send_local_response } from "@solo-io/proxy-runtime/assembly";

// ============================================
// PERSISTENT STATE - Lives across ALL requests
// ============================================

// Token validation cache
const tokenCache = new Map<string, boolean>();
const tokenCacheExpiry = new Map<string, i64>();

// Request counters (persists across requests)
let totalRequests: i32 = 0;
let authenticatedRequests: i32 = 0;
let failedRequests: i32 = 0;

// Rate limiting state
const rateLimitMap = new Map<string, i32>();
const rateLimitWindow = new Map<string, i64>();

// Blacklist/Whitelist (persists until Envoy restarts)
const blacklistedTokens = new Set<string>();
const whitelistedIPs = new Set<string>();

// User session tracking
class UserSession {
  lastAccess: i64 = 0;
  requestCount: i32 = 0;
  authenticated: boolean = false;
}
const userSessions = new Map<string, UserSession>();

// ============================================
// ROOT CONTEXT - Singleton, persists forever
// ============================================
class HeaderValidatorRoot extends RootContext {
  private tickCount: i32 = 0;
  
  constructor(context_id: i32) {
    super(context_id);
    
    // Initialize persistent state (runs once when filter loads)
    this.initializePersistentData();
  }
  
  initializePersistentData(): void {
    // Pre-populate valid tokens
    tokenCache.set("secret-value-123", true);
    tokenCacheExpiry.set("secret-value-123", Date.now() + 3600000); // 1 hour
    
    tokenCache.set("admin-token-456", true);
    tokenCacheExpiry.set("admin-token-456", Date.now() + 3600000);
    
    // Pre-populate whitelisted IPs
    whitelistedIPs.add("127.0.0.1");
    whitelistedIPs.add("10.0.0.1");
    
    // Log initialization
    this.log("Filter initialized with " + tokenCache.size.toString() + " pre-cached tokens");
  }
  
  createContext(context_id: i32): Context {
    return new HeaderValidatorContext(context_id, this);
  }
  
  // Called periodically by Envoy (if configured)
  onTick(): void {
    this.tickCount++;
    
    // Every 100 ticks, clean up expired data
    if (this.tickCount % 100 === 0) {
      this.cleanupExpiredData();
      this.logStats();
    }
  }
  
  cleanupExpiredData(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    // Clean expired tokens
    tokenCacheExpiry.forEach((expiry, key) => {
      if (now > expiry) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      tokenCache.delete(key);
      tokenCacheExpiry.delete(key);
    });
    
    // Clean old rate limit windows
    const oldWindows: string[] = [];
    rateLimitWindow.forEach((window, key) => {
      if (now - window > 60000) { // Older than 1 minute
        oldWindows.push(key);
      }
    });
    
    oldWindows.forEach(key => {
      rateLimitMap.delete(key);
      rateLimitWindow.delete(key);
    });
    
    // Clean old sessions (inactive for > 30 minutes)
    const staleSessions: string[] = [];
    userSessions.forEach((session, key) => {
      if (now - session.lastAccess > 1800000) { // 30 minutes
        staleSessions.push(key);
      }
    });
    
    staleSessions.forEach(key => {
      userSessions.delete(key);
    });
  }
  
  logStats(): void {
    this.log("Stats - Total: " + totalRequests.toString() + 
             ", Authenticated: " + authenticatedRequests.toString() + 
             ", Failed: " + failedRequests.toString() +
             ", Active Sessions: " + userSessions.size.toString());
  }
  
  log(message: string): void {
    // Log to Envoy logs
    stream_context.log("info", "[WASM] " + message);
  }
}

// ============================================
// PER-REQUEST CONTEXT
// ============================================
class HeaderValidatorContext extends Context {
  private rootContext: HeaderValidatorRoot;
  private clientIP: string = "";
  
  constructor(context_id: i32, root_context: HeaderValidatorRoot) {
    super(context_id, root_context);
    this.rootContext = root_context;
  }

  onRequestHeaders(a: i32, end_of_stream: boolean): FilterHeadersStatusValues {
    if (!end_of_stream) {
      return FilterHeadersStatusValues.Continue;
    }
    
    // Increment global counter (persists across requests)
    totalRequests++;
    
    // Get client IP for rate limiting
    this.clientIP = stream_context.headers.request.get("x-forwarded-for") || 
                   stream_context.headers.request.get("x-real-ip") || 
                   "unknown";
    
    // Check if IP is whitelisted (persistent whitelist)
    if (whitelistedIPs.has(this.clientIP)) {
      stream_context.headers.request.add("x-validation-status", "whitelisted");
      authenticatedRequests++;
      return FilterHeadersStatusValues.Continue;
    }
    
    // Rate limiting using persistent state
    if (!this.checkRateLimit(this.clientIP)) {
      failedRequests++;
      send_local_response(429, "", '{"error":"Rate limit exceeded"}', [], -1);
      return FilterHeadersStatusValues.StopIteration;
    }
    
    // Check custom header
    const customHeader = stream_context.headers.request.get("x-custom-auth");
    
    if (customHeader) {
      // Check blacklist first (persistent)
      if (blacklistedTokens.has(customHeader)) {
        failedRequests++;
        send_local_response(401, "", '{"error":"Token blacklisted"}', [], -1);
        return FilterHeadersStatusValues.StopIteration;
      }
      
      // Check persistent token cache
      const cached = tokenCache.get(customHeader);
      const expiry = tokenCacheExpiry.get(customHeader);
      const now = Date.now();
      
      if (cached !== undefined && expiry && now < expiry) {
        if (cached) {
          // Valid token - update session
          this.updateSession(customHeader, true);
          stream_context.headers.request.add("x-validation-status", "authenticated");
          authenticatedRequests++;
          return FilterHeadersStatusValues.Continue;
        } else {
          // Cached as invalid
          failedRequests++;
          send_local_response(401, "", '{"error":"Invalid token (cached)"}', [], -1);
          return FilterHeadersStatusValues.StopIteration;
        }
      }
      
      // Not in cache - validate and cache result
      const isValid = this.validateToken(customHeader);
      
      // Cache the result (persists for future requests)
      tokenCache.set(customHeader, isValid);
      tokenCacheExpiry.set(customHeader, now + 300000); // Cache for 5 minutes
      
      if (isValid) {
        this.updateSession(customHeader, true);
        stream_context.headers.request.add("x-validation-status", "authenticated");
        authenticatedRequests++;
        return FilterHeadersStatusValues.Continue;
      } else {
        failedRequests++;
        send_local_response(401, "", '{"error":"Invalid token"}', [], -1);
        return FilterHeadersStatusValues.StopIteration;
      }
    }
    
    // Fallback to cookie check
    const cookies = stream_context.headers.request.get("cookie");
    if (cookies && (cookies.indexOf("accessToken=") !== -1 || cookies.indexOf("refreshToken=") !== -1)) {
      authenticatedRequests++;
      return FilterHeadersStatusValues.Continue;
    }
    
    failedRequests++;
    send_local_response(401, "", '{"error":"Authentication required"}', [], -1);
    return FilterHeadersStatusValues.StopIteration;
  }
  
  checkRateLimit(clientIP: string): boolean {
    const now = Date.now();
    const windowStart = rateLimitWindow.get(clientIP) || now;
    
    // Reset window if expired (1 minute window)
    if (now - windowStart > 60000) {
      rateLimitMap.set(clientIP, 1);
      rateLimitWindow.set(clientIP, now);
      return true;
    }
    
    const count = rateLimitMap.get(clientIP) || 0;
    if (count >= 100) { // 100 requests per minute
      return false;
    }
    
    rateLimitMap.set(clientIP, count + 1);
    return true;
  }
  
  updateSession(token: string, authenticated: boolean): void {
    let session = userSessions.get(token);
    if (!session) {
      session = new UserSession();
      userSessions.set(token, session);
    }
    
    session.lastAccess = Date.now();
    session.requestCount++;
    session.authenticated = authenticated;
  }
  
  validateToken(token: string): boolean {
    // Simple validation - in real world, this might check format, signature, etc.
    // This result will be cached persistently
    return token.length > 10 && token.startsWith("valid-");
  }

  onResponseHeaders(a: i32, end_of_stream: boolean): FilterHeadersStatusValues {
    if (!end_of_stream) {
      return FilterHeadersStatusValues.Continue;
    }
    
    const validationStatus = stream_context.headers.request.get("x-validation-status");
    
    if (validationStatus === "authenticated" || validationStatus === "whitelisted") {
      stream_context.headers.response.add("x-auth-validated", "true");
      stream_context.headers.response.add("x-request-number", totalRequests.toString());
      
      // Add session info if available
      const customHeader = stream_context.headers.request.get("x-custom-auth");
      if (customHeader) {
        const session = userSessions.get(customHeader);
        if (session) {
          stream_context.headers.response.add("x-session-requests", session.requestCount.toString());
        }
      }
    }
    
    return FilterHeadersStatusValues.Continue;
  }
  
  onLog(): void {
    // Log request completion
    if (totalRequests % 1000 === 0) {
      this.rootContext.logStats();
    }
  }
}

registerRootContext((context_id: i32) => { return new HeaderValidatorRoot(context_id); });