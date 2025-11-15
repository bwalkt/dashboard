/// <reference path="./types.d.ts" />

// ✅ AssemblyScript-specific libraries (these work)
import { JSON } from "assemblyscript-json/assembly";
// import { Regex } from "assemblyscript-regex/assembly";
// import { base64Encode } from "as-string-utils/assembly";

import { 
  RootContext, 
  Context, 
  registerRootContext, 
  FilterHeadersStatusValues, 
  stream_context, 
  send_local_response 
} from "@solo-io/proxy-runtime/assembly";

class LibraryExampleRoot extends RootContext {
  createContext(context_id: i32): Context {
    return new LibraryExampleContext(context_id, this);
  }
}

class LibraryExampleContext extends Context {
  constructor(context_id: i32, root_context: LibraryExampleRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(a: i32, end_of_stream: boolean): FilterHeadersStatusValues {
    if (!end_of_stream) {
      return FilterHeadersStatusValues.Continue;
    }
    
    // ✅ Using AssemblyScript JSON library
    const customData = stream_context.headers.request.get("x-custom-data");
    if (customData) {
      try {
        const parsed = JSON.parse(customData);
        // Work with parsed JSON object
        // Note: API might vary based on library version
      } catch (e) {
        send_local_response(400, "", '{"error":"Invalid JSON"}', [], -1);
        return FilterHeadersStatusValues.StopIteration;
      }
    }
    
    // ✅ Using simple regex patterns (if assemblyscript-regex works)
    const email = stream_context.headers.request.get("x-email");
    if (email) {
      // Simple email validation without regex library
      if (!this.isValidEmailSimple(email)) {
        send_local_response(400, "", '{"error":"Invalid email"}', [], -1);
        return FilterHeadersStatusValues.StopIteration;
      }
    }
    
    return FilterHeadersStatusValues.Continue;
  }
  
  // Simple email validation without regex
  isValidEmailSimple(email: string): boolean {
    const atIndex = email.indexOf("@");
    const dotIndex = email.lastIndexOf(".");
    
    return atIndex > 0 && 
           dotIndex > atIndex + 1 && 
           dotIndex < email.length - 1;
  }

  onResponseHeaders(a: i32, end_of_stream: boolean): FilterHeadersStatusValues {
    return FilterHeadersStatusValues.Continue;
  }
}

registerRootContext((context_id: i32) => { return new LibraryExampleRoot(context_id); });