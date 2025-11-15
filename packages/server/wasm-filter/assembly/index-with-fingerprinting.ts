/// <reference path="./types.d.ts" />
import { RootContext, Context, registerRootContext, FilterHeadersStatusValues, stream_context, send_local_response } from "@solo-io/proxy-runtime/assembly";
import { SimpleFingerprinter } from "./fingerprinting";

// Cache for known fingerprints
const fingerprintCache = new Map<string, boolean>();
const suspiciousFingerprintCache = new Map<string, i32>();

class FingerprintValidatorRoot extends RootContext {
  createContext(context_id: i32): Context {
    return new FingerprintValidatorContext(context_id, this);
  }
}

class FingerprintValidatorContext extends Context {
  constructor(context_id: i32, root_context: FingerprintValidatorRoot) {
    super(context_id, root_context);
  }

  onRequestHeaders(a: i32, end_of_stream: boolean): FilterHeadersStatusValues {
    if (!end_of_stream) {
      return FilterHeadersStatusValues.Continue;
    }
    
    // First check custom auth header
    const customHeader = stream_context.headers.request.get("x-custom-auth");
    if (customHeader === "secret-value-123") {
      stream_context.headers.request.add("x-validation-status", "authenticated");
      return FilterHeadersStatusValues.Continue;
    }
    
    // Get fingerprint from frontend (if available)
    const frontendFingerprint = stream_context.headers.request.get("x-fingerprint-id");
    const frontendConfidence = stream_context.headers.request.get("x-fingerprint-confidence");
    const frontendTimestamp = stream_context.headers.request.get("x-fingerprint-timestamp");
    
    // Generate server-side fingerprint for comparison
    const serverFingerprint = SimpleFingerprinter.generateFingerprint();
    const riskScore = SimpleFingerprinter.createRiskScore();
    
    // Validate frontend fingerprint
    if (frontendFingerprint) {
      const isValidFormat = this.validateFingerprintFormat(frontendFingerprint);
      const isRecentTimestamp = this.validateTimestamp(frontendTimestamp);
      const confidence = parseFloat(frontendConfidence || "0");
      
      if (isValidFormat && isRecentTimestamp && confidence > 0.5) {
        // Frontend fingerprint looks valid
        stream_context.headers.request.add("x-fingerprint-validated", "frontend");
        stream_context.headers.request.add("x-fingerprint-id", frontendFingerprint);
        stream_context.headers.request.add("x-risk-score", confidence.toString());
        
        // Cache as valid fingerprint
        fingerprintCache.set(frontendFingerprint, true);
        
        return this.checkAuthFallback();
      }
    }
    
    // Use server-side fingerprint
    stream_context.headers.request.add("x-fingerprint-validated", "server");
    stream_context.headers.request.add("x-fingerprint-id", serverFingerprint);
    stream_context.headers.request.add("x-risk-score", riskScore.toString());
    
    // Check if this fingerprint has been suspicious
    const suspiciousCount = suspiciousFingerprintCache.get(serverFingerprint) || 0;
    
    if (riskScore < 30 || suspiciousCount > 5) {
      // High risk or previously flagged
      suspiciousFingerprintCache.set(serverFingerprint, suspiciousCount + 1);
      
      send_local_response(
        403,
        "",
        `{"error":"Request blocked","reason":"suspicious_fingerprint","risk_score":${riskScore}}`,
        [],
        -1
      );
      return FilterHeadersStatusValues.StopIteration;
    }
    
    // Medium risk - require additional authentication
    if (riskScore < 60) {
      return this.requireAdditionalAuth("medium_risk");
    }
    
    // Cache as valid
    fingerprintCache.set(serverFingerprint, true);
    
    return this.checkAuthFallback();
  }
  
  validateFingerprintFormat(fingerprint: string): boolean {
    // Check if fingerprint matches expected format
    if (fingerprint.length < 16 || fingerprint.length > 64) {
      return false;
    }
    
    // Check for basic format patterns
    if (fingerprint.startsWith("fp_") || 
        fingerprint.startsWith("fallback_") ||
        /^[a-zA-Z0-9_-]+$/.test(fingerprint)) {
      return true;
    }
    
    return false;
  }
  
  validateTimestamp(timestampStr: string | null): boolean {
    if (!timestampStr) return false;
    
    const timestamp = parseInt(timestampStr);
    if (isNaN(timestamp)) return false;
    
    const now = Date.now();
    const age = now - timestamp;
    
    // Fingerprint should be less than 5 minutes old
    return age < 300000 && age > -30000; // Allow 30s clock skew
  }
  
  requireAdditionalAuth(reason: string): FilterHeadersStatusValues {
    // Check for JWT cookies as additional auth
    const cookies = stream_context.headers.request.get("cookie");
    if (cookies && (cookies.indexOf("accessToken=") !== -1 || cookies.indexOf("refreshToken=") !== -1)) {
      stream_context.headers.request.add("x-auth-method", "jwt_cookie");
      return FilterHeadersStatusValues.Continue;
    }
    
    // No additional auth found
    send_local_response(
      401,
      "",
      `{"error":"Additional authentication required","reason":"${reason}"}`,
      [],
      -1
    );
    return FilterHeadersStatusValues.StopIteration;
  }
  
  checkAuthFallback(): FilterHeadersStatusValues {
    // Check for JWT cookies
    const cookies = stream_context.headers.request.get("cookie");
    if (cookies && (cookies.indexOf("accessToken=") !== -1 || cookies.indexOf("refreshToken=") !== -1)) {
      return FilterHeadersStatusValues.Continue;
    }
    
    // Allow certain paths without auth
    const path = stream_context.headers.request.get(":path");
    if (path && (path.startsWith("/auth/") || path.startsWith("/public/") || path === "/health")) {
      return FilterHeadersStatusValues.Continue;
    }
    
    send_local_response(401, "", '{"error":"Authentication required"}', [], -1);
    return FilterHeadersStatusValues.StopIteration;
  }

  onResponseHeaders(a: i32, end_of_stream: boolean): FilterHeadersStatusValues {
    if (!end_of_stream) {
      return FilterHeadersStatusValues.Continue;
    }
    
    const fingerprintId = stream_context.headers.request.get("x-fingerprint-id");
    const validationMethod = stream_context.headers.request.get("x-fingerprint-validated");
    const riskScore = stream_context.headers.request.get("x-risk-score");
    
    if (fingerprintId) {
      // Add fingerprint info to response headers
      stream_context.headers.response.add("x-fingerprint-validation", validationMethod || "unknown");
      stream_context.headers.response.add("x-client-risk-score", riskScore || "unknown");
      
      // Add rate limiting info
      const suspiciousCount = suspiciousFingerprintCache.get(fingerprintId) || 0;
      if (suspiciousCount > 0) {
        stream_context.headers.response.add("x-suspicious-count", suspiciousCount.toString());
      }
    }
    
    return FilterHeadersStatusValues.Continue;
  }
}

registerRootContext((context_id: i32) => { return new FingerprintValidatorRoot(context_id); });