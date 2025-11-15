/// <reference path="./types.d.ts" />
import { RootContext, Context, registerRootContext, FilterHeadersStatusValues, stream_context, send_local_response } from "@solo-io/proxy-runtime/assembly";
import { httpCall } from "@solo-io/proxy-runtime/assembly/http";

// Buffer for batching events
class EventBuffer {
  private events: Array<string> = [];
  private lastFlush: i64 = Date.now();
  private maxSize: i32 = 100;
  private flushInterval: i64 = 5000; // 5 seconds
  
  add(event: string): void {
    this.events.push(event);
    
    // Flush if buffer is full or time elapsed
    if (this.events.length >= this.maxSize || 
        Date.now() - this.lastFlush > this.flushInterval) {
      this.flush();
    }
  }
  
  flush(): void {
    if (this.events.length === 0) return;
    
    // Prepare batch payload
    const payload = '{"events":[' + this.events.join(',') + ']}';
    
    // Send async HTTP request to Node.js
    const headers: Map<string, string> = new Map();
    headers.set("content-type", "application/json");
    headers.set("x-internal-request", "true"); // Mark as internal
    
    // Fire and forget - don't wait for response
    httpCall(
      "logging_cluster", // Define this cluster in envoy.yaml
      headers,
      payload,
      100, // Very short timeout - we don't care about response
      (context: i32, respHeaders: Map<string, string>, body: string, trailers: Map<string, string>) => {
        // Callback - we can ignore or log errors
        const status = respHeaders.get(":status");
        if (status !== "200") {
          // Log error but don't block request
          stream_context.log("error", "Failed to send events to PostgreSQL");
        }
      }
    );
    
    // Clear buffer
    this.events = [];
    this.lastFlush = Date.now();
  }
}

// Global event buffer (persists across requests)
const eventBuffer = new EventBuffer();

class HeaderValidatorRoot extends RootContext {
  private requestCount: i64 = 0;
  
  createContext(context_id: i32): Context {
    return new HeaderValidatorContext(context_id, this);
  }
  
  onTick(): void {
    // Periodic flush of events
    eventBuffer.flush();
  }
}

class HeaderValidatorContext extends Context {
  private startTime: i64 = 0;
  private clientIP: string = "";
  private userAgent: string = "";
  private authStatus: string = "pending";
  
  constructor(context_id: i32, root_context: HeaderValidatorRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(a: i32, end_of_stream: boolean): FilterHeadersStatusValues {
    if (!end_of_stream) {
      return FilterHeadersStatusValues.Continue;
    }
    
    this.startTime = Date.now();
    
    // Collect request metadata
    this.clientIP = stream_context.headers.request.get("x-forwarded-for") || "unknown";
    this.userAgent = stream_context.headers.request.get("user-agent") || "unknown";
    const path = stream_context.headers.request.get(":path") || "/";
    const method = stream_context.headers.request.get(":method") || "GET";
    
    // Check authentication
    const customHeader = stream_context.headers.request.get("x-custom-auth");
    
    if (customHeader === "secret-value-123") {
      this.authStatus = "authenticated";
      stream_context.headers.request.add("x-validation-status", "authenticated");
      
      // Log successful auth event asynchronously
      const authEvent = `{
        "type": "auth_success",
        "timestamp": ${this.startTime},
        "client_ip": "${this.clientIP}",
        "path": "${path}",
        "method": "${method}",
        "token": "${customHeader.substring(0, 8)}..."
      }`;
      eventBuffer.add(authEvent);
      
      return FilterHeadersStatusValues.Continue;
    }
    
    // Check for JWT cookies
    const cookies = stream_context.headers.request.get("cookie");
    if (cookies && (cookies.indexOf("accessToken=") !== -1)) {
      this.authStatus = "jwt";
      return FilterHeadersStatusValues.Continue;
    }
    
    this.authStatus = "failed";
    
    // Log failed auth event
    const failEvent = `{
      "type": "auth_failed",
      "timestamp": ${this.startTime},
      "client_ip": "${this.clientIP}",
      "path": "${path}",
      "reason": "missing_credentials"
    }`;
    eventBuffer.add(failEvent);
    
    send_local_response(401, "", '{"error":"Authentication required"}', [], -1);
    return FilterHeadersStatusValues.StopIteration;
  }

  onResponseHeaders(a: i32, end_of_stream: boolean): FilterHeadersStatusValues {
    if (!end_of_stream) {
      return FilterHeadersStatusValues.Continue;
    }
    
    // Log request completion
    const duration = Date.now() - this.startTime;
    const status = stream_context.headers.response.get(":status") || "200";
    
    const requestEvent = `{
      "type": "request_complete",
      "timestamp": ${Date.now()},
      "client_ip": "${this.clientIP}",
      "duration_ms": ${duration},
      "status_code": "${status}",
      "auth_status": "${this.authStatus}"
    }`;
    eventBuffer.add(requestEvent);
    
    if (this.authStatus === "authenticated") {
      stream_context.headers.response.add("x-auth-validated", "true");
      stream_context.headers.response.add("x-request-duration", duration.toString());
    }
    
    return FilterHeadersStatusValues.Continue;
  }
  
  onLog(): void {
    // Called when request completes
    // Could trigger immediate flush for important events
    if (this.authStatus === "failed") {
      eventBuffer.flush(); // Immediate flush for security events
    }
  }
}

registerRootContext((context_id: i32) => { return new HeaderValidatorRoot(context_id); });