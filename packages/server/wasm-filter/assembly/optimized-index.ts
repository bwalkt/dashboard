/// <reference path="./types.d.ts" />
import { RootContext, Context, registerRootContext, FilterHeadersStatusValues, stream_context, send_local_response } from "@solo-io/proxy-runtime/assembly";

// Pre-compile validation rules for maximum performance
const VALID_TOKENS = new Set<string>([
  "secret-value-123",
  "another-valid-token",
  "test-token-456"
]);

// Pre-compile allowed paths (no regex overhead)
const AUTH_PATHS = ["/auth/login", "/auth/callback", "/proxy"];

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
    if (!end_of_stream) {
      return FilterHeadersStatusValues.Continue;
    }
    
    // Ultra-fast in-memory validation (microseconds)
    const customHeader = stream_context.headers.request.get("x-custom-auth");
    
    if (customHeader && VALID_TOKENS.has(customHeader)) {
      stream_context.headers.request.add("x-validation-status", "authenticated");
      return FilterHeadersStatusValues.Continue;
    }
    
    // Fast path checking (no regex)
    const path = stream_context.headers.request.get(":path");
    const method = stream_context.headers.request.get(":method");
    
    // Quick path validation
    if (path) {
      for (let i = 0; i < AUTH_PATHS.length; i++) {
        if (path.startsWith(AUTH_PATHS[i])) {
          return FilterHeadersStatusValues.Continue;
        }
      }
    }
    
    if (method === "OPTIONS") {
      return FilterHeadersStatusValues.Continue;
    }
    
    // Fast cookie check
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