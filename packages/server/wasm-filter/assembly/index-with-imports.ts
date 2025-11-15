/// <reference path="./types.d.ts" />
// ✅ These imports work - your own AssemblyScript files
import { 
  isValidEmail, 
  hashString, 
  SimpleValidator, 
  VALID_DOMAINS 
} from "./utils";

import { 
  MAX_REQUEST_SIZE, 
  RATE_LIMIT_WINDOW,
  ALLOWED_PATHS,
  BLOCKED_USER_AGENTS,
  AuthStatus 
} from "./constants";

import { SimpleFingerprinter } from "./fingerprinting";

// ✅ This import works - Envoy proxy runtime
import { 
  RootContext, 
  Context, 
  registerRootContext, 
  FilterHeadersStatusValues, 
  stream_context, 
  send_local_response 
} from "@solo-io/proxy-runtime/assembly";

class MyFilterRoot extends RootContext {
  createContext(context_id: i32): Context {
    return new MyFilterContext(context_id, this);
  }
}

class MyFilterContext extends Context {
  constructor(context_id: i32, root_context: MyFilterRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(a: i32, end_of_stream: boolean): FilterHeadersStatusValues {
    if (!end_of_stream) {
      return FilterHeadersStatusValues.Continue;
    }
    
    // ✅ Use imported functions and constants
    const userAgent = stream_context.headers.request.get("user-agent") || "";
    const path = stream_context.headers.request.get(":path") || "";
    const customAuth = stream_context.headers.request.get("x-custom-auth") || "";
    
    // Check blocked user agents
    for (let i = 0; i < BLOCKED_USER_AGENTS.length; i++) {
      if (userAgent.toLowerCase().includes(BLOCKED_USER_AGENTS[i])) {
        send_local_response(403, "", '{"error":"Blocked user agent"}', [], -1);
        return FilterHeadersStatusValues.StopIteration;
      }
    }
    
    // Check allowed paths
    let pathAllowed = false;
    for (let i = 0; i < ALLOWED_PATHS.length; i++) {
      if (path.startsWith(ALLOWED_PATHS[i])) {
        pathAllowed = true;
        break;
      }
    }
    
    if (pathAllowed) {
      return FilterHeadersStatusValues.Continue;
    }
    
    // Validate token using imported utility
    if (customAuth && SimpleValidator.validateToken(customAuth)) {
      stream_context.headers.request.add("x-validation-status", "authenticated");
      
      // Create fingerprint using imported class
      const fingerprint = SimpleFingerprinter.generateFingerprint();
      stream_context.headers.request.add("x-fingerprint", fingerprint);
      
      return FilterHeadersStatusValues.Continue;
    }
    
    // Check for email in headers (using imported validator)
    const email = stream_context.headers.request.get("x-user-email");
    if (email && isValidEmail(email)) {
      // Hash the email using imported function
      const hashedEmail = hashString(email);
      stream_context.headers.request.add("x-user-hash", hashedEmail);
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
      
      // Add timestamp using imported utility
      const timestamp = SimpleValidator.createTimestamp();
      stream_context.headers.response.add("x-auth-timestamp", timestamp.toString());
    }
    
    return FilterHeadersStatusValues.Continue;
  }
}

registerRootContext((context_id: i32) => { return new MyFilterRoot(context_id); });