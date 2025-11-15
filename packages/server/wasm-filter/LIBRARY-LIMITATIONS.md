# Library Import Limitations in Wasm/AssemblyScript

## Why JavaScript Libraries Don't Work

### 1. **Different Runtime Environment**
```typescript
// ❌ This won't work in AssemblyScript
import FingerprintJS from '@fingerprintjs/fingerprintjs';

// JavaScript libraries expect:
- Browser DOM APIs (document, window)
- Node.js APIs (process, Buffer)
- JavaScript-specific features (eval, dynamic imports)
```

### 2. **AssemblyScript Type System**
```typescript
// ❌ JavaScript libraries use dynamic types
const fp = await FingerprintJS.load();

// ❌ Wasm doesn't support:
- Dynamic typing (any, unknown)
- Async/await with complex promises
- Function overloading
- Prototype manipulation
```

### 3. **Sandboxed Environment**
- Wasm runs in isolated sandbox
- No access to DOM, file system, network
- Limited set of allowed operations
- Can only call approved host functions

## What You CAN Import

### ✅ AssemblyScript-Specific Libraries
```typescript
// Built for AssemblyScript
import { JSON } from "assemblyscript-json";
import { SHA256 } from "assemblyscript-crypto";
```

### ✅ Envoy Proxy Runtime
```typescript
import { 
  RootContext, 
  Context, 
  stream_context 
} from "@solo-io/proxy-runtime/assembly";
```

### ✅ Simple Utilities (if ported)
```typescript
// Simple string/math utilities work
import { base64Encode } from "./utils";
```

## Alternatives for Browser Fingerprinting

Since you can't use FingerprintJS directly, here are alternatives:

### Option 1: HTTP Headers-Based Fingerprinting
```typescript
function createFingerprint(headers: Map<string, string>): string {
  const userAgent = headers.get("user-agent") || "";
  const acceptLanguage = headers.get("accept-language") || "";
  const acceptEncoding = headers.get("accept-encoding") || "";
  const accept = headers.get("accept") || "";
  const connection = headers.get("connection") || "";
  
  // Simple concatenation hash
  const combined = userAgent + "|" + acceptLanguage + "|" + 
                  acceptEncoding + "|" + accept + "|" + connection;
  
  return hashString(combined);
}

function hashString(str: string): string {
  let hash: u32 = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}
```

### Option 2: Delegate to Node.js
```typescript
// In Wasm - collect raw data
const fingerprint_data = {
  user_agent: headers.get("user-agent"),
  accept_language: headers.get("accept-language"),
  x_forwarded_for: headers.get("x-forwarded-for"),
  timestamp: Date.now()
};

// Send to Node.js for processing
httpCall("fingerprint-service", headers, JSON.stringify(fingerprint_data));
```

### Option 3: Pre-process in Frontend
```typescript
// Frontend JavaScript (before request)
const fp = await FingerprintJS.load();
const result = await fp.get();

// Include in header
fetch('/api/endpoint', {
  headers: {
    'x-fingerprint': result.visitorId,
    'x-fingerprint-confidence': result.confidence.toString()
  }
});

// Wasm just validates the header
const fingerprint = headers.get("x-fingerprint");
if (fingerprint && isValidFingerprint(fingerprint)) {
  // Process fingerprint
}
```

## Workarounds for Common Libraries

### Crypto Operations
```typescript
// ❌ Can't use crypto-js
import CryptoJS from 'crypto-js';

// ✅ Use AssemblyScript crypto or simple hashing
function simpleHash(input: string): string {
  // Implement simple hash function
}

// ✅ Or delegate to Node.js
httpCall("crypto-service", headers, `{"operation":"hash","data":"${input}"}`);
```

### Date/Time Operations
```typescript
// ❌ Can't use moment.js
import moment from 'moment';

// ✅ Use built-in Date (limited functionality)
const now = Date.now();
const date = new Date(now);

// ✅ Or delegate complex date operations
```

### JSON Processing
```typescript
// ❌ Can't use lodash
import _ from 'lodash';

// ✅ Use assemblyscript-json
import { JSON } from "assemblyscript-json";

const parsed = JSON.parse(jsonString);
```

## Creating Custom AssemblyScript Libraries

You can port simple JavaScript libraries:

```typescript
// Original JavaScript
function isEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// AssemblyScript version
function isEmail(email: string): boolean {
  // Simple validation without regex
  return email.includes("@") && 
         email.includes(".") && 
         email.length > 5;
}
```

## Hybrid Architecture

Best approach for complex operations:

```typescript
// Wasm handles:
- Fast validation
- Simple computations  
- Header parsing
- Rate limiting

// Node.js handles:
- Complex libraries (FingerprintJS)
- Database operations
- External API calls
- Heavy computations

// Communication:
- Wasm -> Node.js: HTTP calls for complex operations
- Node.js -> Wasm: Results via headers or responses
```

## Performance Considerations

| Operation | Wasm | Node.js | Winner |
|-----------|------|---------|---------|
| Header parsing | 0.01ms | 0.1ms | Wasm |
| Simple hash | 0.01ms | 0.05ms | Wasm |
| FingerprintJS | N/A | 5-20ms | Node.js only |
| Crypto (complex) | Limited | Full | Node.js |
| Rate limiting | 0.01ms | 1ms | Wasm |

## Recommendations

1. **Use Wasm for**: Fast, simple operations
2. **Use Node.js for**: Complex libraries, external services
3. **Hybrid approach**: Best of both worlds
4. **Pre-process in frontend**: When possible (fingerprinting)
5. **Cache results**: Reduce repeated complex operations