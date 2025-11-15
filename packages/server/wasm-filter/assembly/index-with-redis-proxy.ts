/// <reference path="./types.d.ts" />
import { RootContext, Context, registerRootContext, FilterHeadersStatusValues, stream_context, send_local_response } from "@solo-io/proxy-runtime/assembly";
import { httpCall } from "@solo-io/proxy-runtime/assembly/http";

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
    
    const customHeader = stream_context.headers.request.get("x-custom-auth");
    
    if (customHeader) {
      // Check Redis via HTTP proxy for token validation
      const headers: Map<string, string> = new Map();
      headers.set("content-type", "application/json");
      
      const body = `{"operation":"get","key":"auth:${customHeader}"}`;
      
      // This is async - you'd need to handle the callback
      httpCall(
        "server_cluster",
        headers,
        body,
        1000, // 1 second timeout
        (callbackContext: i32, responseHeaders: Map<string, string>, responseBody: string, trailers: Map<string, string>) => {
          const status = responseHeaders.get(":status");
          if (status === "200") {
            // Parse response and check if token is valid
            if (responseBody.includes('"value":"valid"')) {
              stream_context.headers.request.add("x-validation-status", "authenticated");
            }
          }
        }
      );
      
      // Note: This is async, so you'd need to pause processing
      return FilterHeadersStatusValues.Pause;
    }
    
    return FilterHeadersStatusValues.Continue;
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