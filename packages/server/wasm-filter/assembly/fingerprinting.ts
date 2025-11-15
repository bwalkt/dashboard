/// <reference path="./types.d.ts" />
import { stream_context } from "@solo-io/proxy-runtime/assembly";

export class SimpleFingerprinter {
  
  static generateFingerprint(): string {
    // Collect available headers
    const userAgent = stream_context.headers.request.get("user-agent") || "";
    const acceptLanguage = stream_context.headers.request.get("accept-language") || "";
    const acceptEncoding = stream_context.headers.request.get("accept-encoding") || "";
    const accept = stream_context.headers.request.get("accept") || "";
    const connection = stream_context.headers.request.get("connection") || "";
    const cacheControl = stream_context.headers.request.get("cache-control") || "";
    const upgrade = stream_context.headers.request.get("upgrade-insecure-requests") || "";
    const secFetch = stream_context.headers.request.get("sec-fetch-site") || "";
    
    // Get client IP info
    const xForwardedFor = stream_context.headers.request.get("x-forwarded-for") || "";
    const xRealIP = stream_context.headers.request.get("x-real-ip") || "";
    
    // Create fingerprint components
    const components = [
      this.hashString(userAgent),
      this.hashString(acceptLanguage),
      this.hashString(acceptEncoding),
      this.hashString(accept),
      this.hashString(connection),
      this.hashString(cacheControl),
      this.hashString(upgrade),
      this.hashString(secFetch)
    ];
    
    // Combine components
    const combined = components.join("-");
    const finalHash = this.hashString(combined);
    
    // Add IP component
    const ipHash = this.hashString(xForwardedFor || xRealIP);
    
    return `fp_${finalHash}_${ipHash}`;
  }
  
  static hashString(str: string): string {
    if (str.length === 0) return "0";
    
    let hash: u32 = 5381;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) + hash) + char; // hash * 33 + char
    }
    return (hash >>> 0).toString(16); // Convert to unsigned 32-bit hex
  }
  
  static isValidBrowser(): boolean {
    const userAgent = stream_context.headers.request.get("user-agent") || "";
    
    // Check for common browser signatures
    if (userAgent.includes("Chrome/") || 
        userAgent.includes("Firefox/") || 
        userAgent.includes("Safari/") ||
        userAgent.includes("Edge/")) {
      return true;
    }
    
    // Check for suspicious patterns (bots)
    if (userAgent.includes("bot") || 
        userAgent.includes("spider") ||
        userAgent.includes("crawl") ||
        userAgent.length < 10) {
      return false;
    }
    
    return true;
  }
  
  static detectSuspiciousPatterns(): string | null {
    const userAgent = stream_context.headers.request.get("user-agent") || "";
    const accept = stream_context.headers.request.get("accept") || "";
    
    // No User-Agent (suspicious)
    if (userAgent.length === 0) {
      return "no_user_agent";
    }
    
    // Generic/default User-Agent
    if (userAgent === "Mozilla/5.0" || 
        userAgent.includes("curl") ||
        userAgent.includes("wget")) {
      return "generic_user_agent";
    }
    
    // Missing common headers
    if (accept.length === 0) {
      return "missing_accept_header";
    }
    
    // Unusual header combinations
    const hasSecFetch = stream_context.headers.request.get("sec-fetch-site") !== null;
    const hasUpgrade = stream_context.headers.request.get("upgrade-insecure-requests") !== null;
    
    if (userAgent.includes("Chrome/") && !hasSecFetch) {
      return "chrome_missing_sec_fetch";
    }
    
    return null; // No suspicious patterns detected
  }
  
  static createRiskScore(): i32 {
    let score = 0;
    
    // Base score for valid browser
    if (this.isValidBrowser()) {
      score += 50;
    }
    
    // Penalty for suspicious patterns
    const suspicious = this.detectSuspiciousPatterns();
    if (suspicious !== null) {
      score -= 30;
    }
    
    // Check header richness (more headers = more likely real browser)
    const headerCount = this.countHeaders();
    if (headerCount > 10) {
      score += 20;
    } else if (headerCount < 5) {
      score -= 20;
    }
    
    // Check for TLS/HTTPS
    const protocol = stream_context.headers.request.get(":scheme");
    if (protocol === "https") {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  static countHeaders(): i32 {
    let count = 0;
    const commonHeaders = [
      "user-agent", "accept", "accept-language", "accept-encoding",
      "connection", "cache-control", "upgrade-insecure-requests",
      "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest",
      "referer", "authorization", "cookie"
    ];
    
    for (let i = 0; i < commonHeaders.length; i++) {
      if (stream_context.headers.request.get(commonHeaders[i]) !== null) {
        count++;
      }
    }
    
    return count;
  }
}