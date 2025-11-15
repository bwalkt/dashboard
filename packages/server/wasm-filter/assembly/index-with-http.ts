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
      // Make HTTP call to your Node.js server for validation
      const headers: Map<string, string> = new Map();
      headers.set("content-type", "application/json");
      headers.set("x-custom-auth", customHeader);
      
      // Call your server's validation endpoint
      httpCall(
        "server_cluster",  // Use the cluster name from envoy.yaml
        headers,
        '{"action": "validate", "header": "' + customHeader + '"}',
        5000,  // timeout in ms
        (callbackContext: i32, headers: Map<string, string>, body: string, trailers: Map<string, string>) => {
          // Handle response from your server
          const status = headers.get(":status");
          if (status === "200") {
            // Validation successful
            stream_context.headers.request.add("x-validation-status", "authenticated");
          }
        }
      );
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