/// <reference path="./types.d.ts" />
import { RootContext, Context, registerRootContext, FilterHeadersStatusValues, stream_context, send_local_response } from "@solo-io/proxy-runtime/assembly";

class HeaderValidatorRoot extends RootContext {
  createContext(context_id: i32): Context {
    return new HeaderValidatorContext(context_id, this);
  }
}

class HeaderValidatorContext extends Context {
  constructor(context_id: i32, root_context: HeaderValidatorRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(a: i32, end_of_stream: boolean): FilterHeadersStatusValues {
    // Only process headers when we have all of them (end_of_stream = true)
    // This ensures we don't make decisions on partial header data
    if (!end_of_stream) {
      return FilterHeadersStatusValues.Continue;
    }
    
    // Get the custom header value
    const customHeader = stream_context.headers.request.get("x-custom-auth");
    
    // Validate the header value
    if (customHeader === "secret-value-123") {
      // Add validation status header to pass to response handler
      stream_context.headers.request.add("x-validation-status", "authenticated");
      
      // Continue processing
      return FilterHeadersStatusValues.Continue;
    }
    
    // If header doesn't match, check for JWT cookies (existing logic)
    const path = stream_context.headers.request.get(":path");
    const method = stream_context.headers.request.get(":method");
    
    // Allow auth routes without cookie check
    if (path && (path.startsWith("/auth/login") || path.startsWith("/auth/callback") || path.startsWith("/proxy"))) {
      return FilterHeadersStatusValues.Continue;
    }
    
    // Allow OPTIONS requests for CORS preflight
    if (method === "OPTIONS") {
      return FilterHeadersStatusValues.Continue;
    }
    
    // Check for JWT cookie existence
    const cookies = stream_context.headers.request.get("cookie");
    if (cookies) {
      // Check if accessToken or refreshToken cookie exists
      if (cookies.includes("accessToken=") || cookies.includes("refreshToken=")) {
        return FilterHeadersStatusValues.Continue;
      }
    }
    
    // No valid authentication found, return 401
    send_local_response(401, "", '{"error":"Authentication required"}', [], -1);
    return FilterHeadersStatusValues.StopIteration;
  }

  onResponseHeaders(a: i32, end_of_stream: boolean): FilterHeadersStatusValues {
    // Only add our custom headers when we have all response headers
    // end_of_stream=false means more headers might come (e.g., trailers in HTTP/2)
    if (!end_of_stream) {
      // Wait for all headers before adding our custom ones
      return FilterHeadersStatusValues.Continue;
    }
    
    // Check if the request had valid custom header authentication
    const validationStatus = stream_context.headers.request.get("x-validation-status");
    
    if (validationStatus === "authenticated") {
      // Add custom response headers when validation passed
      stream_context.headers.response.add("x-auth-validated", "true");
      
      // Add timestamp (using a static timestamp for now, as Date.now() may not be available)
      // In production, you might want to use a different approach or import a time function
      stream_context.headers.response.add("x-validation-timestamp", "validated");
    }
    
    return FilterHeadersStatusValues.Continue;
  }
}

registerRootContext((context_id: i32) => { return new HeaderValidatorRoot(context_id); });