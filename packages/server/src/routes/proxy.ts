import { lookup } from "dns/promises";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { parse as parseQuery } from "querystring";
import { config } from "../config/env";

// Security constants
const MaxResponseSize = 10 * 1024 * 1024; // 10MB
const MaxRequestSize = 1024 * 1024; // 1MB
const MaxHeaderSize = 4096; // 4KB per header
const MaxQueryLength = 2048; // 2KB for query string
const MaxPathLength = 1024; // 1KB for URL path

// Allowed ports for HTTP/HTTPS
const allowedPorts = new Set([80, 443, 3000, 8080, 8443]);

// isPortAllowed checks if the port is in the allowed list
function isPortAllowed(port: number): boolean {
  return allowedPorts.has(port);
}

// validateURLPath checks for path traversal attacks and other malicious patterns
function validateURLPath(urlPath: string): boolean {
  // Check path length
  if (urlPath.length > MaxPathLength) {
    return false;
  }

  // Check for path traversal patterns
  const dangerousPatterns = [
    "../",
    "./",
    "..\\",
    ".\\",
    "..%2f",
    "..%5c",
    "%2e%2e%2f",
    "%2e%2e%5c",
    "%252e%252e%252f",
    "..%252f",
    "..%255c",
    "%c0%ae%c0%ae%c0%af",
  ];

  const pathLower = urlPath.toLowerCase();
  for (const pattern of dangerousPatterns) {
    if (pathLower.includes(pattern)) {
      return false;
    }
  }

  // Check for null bytes
  if (urlPath.includes("\x00")) {
    return false;
  }

  // Validate path using URL parsing
  try {
    const testUrl = new URL(urlPath, "http://example.com");
    const cleanPath = testUrl.pathname;
    // Basic validation - ensure path doesn't contain dangerous patterns
    return true;
  } catch {
    return false;
  }
}

// validateQueryParameters validates query parameters for malicious content
function validateQueryParameters(query: string): boolean {
  // Check query length
  if (query.length > MaxQueryLength) {
    return false;
  }

  try {
    // Parse query parameters
    const params = parseQuery(query);

    // Check each parameter value
    for (const [key, value] of Object.entries(params)) {
      // Check key length
      if (key.length > 256) {
        return false;
      }

      // Check for dangerous patterns in keys
      const keyLower = key.toLowerCase();
      if (
        keyLower.includes("script") ||
        keyLower.includes("javascript") ||
        keyLower.includes("vbscript")
      ) {
        return false;
      }

      // Check each value (can be string or string[])
      const values = Array.isArray(value) ? value : [value];
      for (const val of values) {
        if (typeof val !== "string") continue;
        if (val.length > 1024) {
          // Limit individual parameter value size
          return false;
        }

        // Check for SQL injection patterns
        const sqlPatterns = [
          "'",
          '"',
          ";",
          "--",
          "/*",
          "*/",
          "xp_",
          "sp_",
          "union",
          "select",
          "insert",
          "update",
          "delete",
          "drop",
          "create",
          "alter",
          "exec",
          "execute",
        ];

        const valueLower = val.toLowerCase();
        for (const pattern of sqlPatterns) {
          if (valueLower.includes(pattern)) {
            return false;
          }
        }

        // Check for script injection patterns
        const scriptPatterns = [
          "<script",
          "</script>",
          "javascript:",
          "vbscript:",
          "onload=",
          "onerror=",
          "onclick=",
          "onmouseover=",
          "<iframe",
          "</iframe>",
          "<object",
          "</object>",
          "<embed",
          "</embed>",
          "<link",
          "<meta",
        ];

        for (const pattern of scriptPatterns) {
          if (val.toLowerCase().includes(pattern)) {
            return false;
          }
        }
      }
    }
  } catch {
    return false;
  }

  return true;
}

// validateURLScheme checks if the URL scheme is allowed
function validateURLScheme(scheme: string): boolean {
  const allowedSchemes = ["http", "https"];
  return allowedSchemes.includes(scheme.toLowerCase());
}

// validateHostname checks hostname for malicious patterns
function validateHostname(hostname: string): boolean {
  // Check hostname length
  if (hostname.length > 253) {
    return false;
  }

  // Check for valid hostname pattern
  const hostnameRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!hostnameRegex.test(hostname)) {
    return false;
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "169.254.169.254",
    "metadata.google.internal",
  ];

  const hostnameLower = hostname.toLowerCase();
  for (const pattern of dangerousPatterns) {
    if (hostnameLower === pattern) {
      return false;
    }
  }

  // Check for .internal domains
  return !hostnameLower.endsWith(".internal");
}

// isInternalIP checks if the hostname resolves to an internal IP address
async function isInternalIP(hostname: string): Promise<boolean> {
  // Check if it's a direct IP address
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipRegex.test(hostname)) {
    // Parse IP address
    const parts = hostname.split(".").map(Number);
    const firstOctet = parts[0];

    // Check for loopback (127.0.0.0/8)
    if (firstOctet === 127) return true;

    // Check for private networks
    // 10.0.0.0/8
    if (firstOctet === 10) return true;
    // 172.16.0.0/12
    if (
      firstOctet === 172 &&
      parts?.[1] &&
      parts?.[1] >= 16 &&
      parts?.[1] <= 31
    )
      return true;
    // 192.168.0.0/16
    if (firstOctet === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (link-local)
    if (firstOctet === 169 && parts[1] === 254) return true;

    // Check for unspecified (0.0.0.0)
    if (hostname === "0.0.0.0") return true;

    return false;
  }

  // Resolve hostname to IP
  try {
    const addresses = await lookup(hostname, { all: true });
    for (const addr of addresses) {
      const ip = addr.address;
      // Check if IP is internal
      if (ipRegex.test(ip)) {
        const ipParts = ip.split(".").map(Number);
        const firstOctet = ipParts[0];

        // Check for loopback
        if (firstOctet === 127) return true;
        // Check for private networks
        if (firstOctet === 10) return true;
        if (
          firstOctet === 172 &&
          ipParts?.[1] &&
          ipParts?.[1] >= 16 &&
          ipParts?.[1] <= 31
        )
          return true;
        if (firstOctet === 192 && ipParts[1] === 168) return true;
        if (firstOctet === 169 && ipParts[1] === 254) return true;
        if (ip === "0.0.0.0") return true;
      }
      // IPv6 loopback
      if (ip === "::1") return true;
    }
  } catch {
    // Block if we can't resolve (safer)
    return true;
  }

  return false;
}

// isCloudMetadata checks if the hostname is a cloud metadata endpoint
function isCloudMetadata(hostname: string): boolean {
  const cloudMetadataHosts = [
    "169.254.169.254", // AWS, Azure, GCP metadata
    "metadata.google.internal", // GCP metadata
  ];

  const hostnameLower = hostname.toLowerCase();
  for (const host of cloudMetadataHosts) {
    if (hostnameLower === host) {
      return true;
    }
  }

  // Check for .internal domains
  return hostnameLower.endsWith(".internal");
}

// isHostnameInAllowedDomains checks if a hostname:port combination is explicitly in ALLOWED_DOMAINS
function isHostnameInAllowedDomains(
  targetHost: string,
  targetPort: string,
): boolean {
  const allowedDomainsStr = config.ALLOWED_DOMAINS;
  if (!allowedDomainsStr) {
    return false;
  }

  const allowedDomains = allowedDomainsStr.split(",").map((d) => d.trim());

  for (const domain of allowedDomains) {
    if (!domain) continue;

    let allowedHostname: string;
    let allowedPort: string;

    // Extract hostname and port from domain
    if (domain.includes(":")) {
      // If domain includes port, extract both hostname and port
      const [host, port] = domain.split(":");
      allowedHostname = host || "";
      allowedPort = port || "";
    } else {
      // No port specified in allowed domain
      allowedHostname = domain;
      allowedPort = "";
    }

    // Support wildcard-style subdomain allowlist entries starting with '.'
    // e.g., ".example.com" allows any subdomain of example.com
    if (allowedHostname.startsWith(".")) {
      if (targetHost.endsWith(allowedHostname)) {
        // For wildcard domains, only validate port if specified
        if (!allowedPort || targetPort === allowedPort) {
          return true;
        }
      }
      continue;
    }

    // Check hostname match
    if (targetHost === allowedHostname) {
      // If port is specified in allowed domain, it must match
      if (!allowedPort) {
        // No port specified - allow any valid port
        return true;
      } else if (targetPort === allowedPort) {
        // Port specified and matches
        return true;
      }
      // Hostname matches but port doesn't - continue checking other domains
    }
  }

  return false;
}

// isValidDomain checks if the given URL belongs to an allowed domain with enhanced validation
async function isValidDomain(targetURL: string): Promise<boolean> {
  // Parse the URL to extract the domain
  let parsedURL: URL;
  try {
    parsedURL = new URL(targetURL);
  } catch {
    return false;
  }

  // Validate scheme
  if (!validateURLScheme(parsedURL.protocol.replace(":", ""))) {
    return false;
  }

  const targetHost = parsedURL.hostname;
  const targetPortStr = parsedURL.port;
  let targetPort = targetPortStr;

  // Get default port based on scheme if no port specified
  if (!targetPort) {
    if (parsedURL.protocol === "https:") {
      targetPort = "443";
    } else {
      targetPort = "80";
    }
  }

  // Validate port (use the actual port string if provided, otherwise use default)
  const portToValidate = targetPortStr || targetPort;
  const port = parseInt(portToValidate, 10);
  if (isNaN(port) || !isPortAllowed(port)) {
    return false;
  }

  // Validate path
  if (!validateURLPath(parsedURL.pathname)) {
    return false;
  }

  // Validate query parameters
  if (!validateQueryParameters(parsedURL.search.substring(1))) {
    return false;
  }

  // Check if hostname is explicitly in ALLOWED_DOMAINS first
  // If it is, skip security restrictions (allows localhost, internal IPs, etc.)
  const isExplicitlyAllowed = isHostnameInAllowedDomains(
    targetHost,
    targetPort,
  );

  if (!isExplicitlyAllowed) {
    // If not explicitly allowed, apply security restrictions

    // Validate hostname (blocks localhost, etc.)
    if (!validateHostname(targetHost)) {
      return false;
    }

    // Block internal IP addresses
    if (await isInternalIP(targetHost)) {
      return false;
    }

    // Block cloud metadata endpoints
    if (isCloudMetadata(targetHost)) {
      return false;
    }
  }

  // Get allowed domains from environment variable
  const allowedDomainsStr = config.ALLOWED_DOMAINS;
  if (!allowedDomainsStr) {
    // If no domains are configured, deny all requests for security
    return false;
  }

  // Final check: verify the hostname is in ALLOWED_DOMAINS
  return isHostnameInAllowedDomains(targetHost, targetPort);
}

// sanitizeHeaders removes potentially dangerous headers from the request
function sanitizeHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> {
  if (!headers) {
    return {};
  }

  const sanitized: Record<string, string> = {};

  // Blocked headers that could be dangerous
  const blockedHeaders = new Set([
    "host",
    "x-forwarded-for",
    "x-real-ip",
    "x-forwarded-proto",
    "x-forwarded-host",
    "x-forwarded-port",
    "x-original-url",
    "x-rewrite-url",
    "proxy-authorization",
    "proxy-connection",
    "upgrade",
    "connection",
    "te",
    "trailers",
    "transfer-encoding",
  ]);

  for (const [key, value] of Object.entries(headers)) {
    // Canonicalize header name to standard format
    const canonicalKey = key
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join("-");

    // Skip blocked headers
    if (blockedHeaders.has(canonicalKey.toLowerCase())) {
      continue;
    }

    // Basic validation for header values
    if (value.length > 4096) {
      // Limit header value size
      continue;
    }

    sanitized[canonicalKey] = value;
  }

  return sanitized;
}

// overrideCookieDomain modifies a Set-Cookie header to override the domain attribute
// with the domain from the COOKIE_DOMAIN environment variable
function overrideCookieDomain(
  cookieValue: string,
  overrideDomain: string,
): string {
  if (!overrideDomain) {
    return cookieValue; // Return as-is if no override domain is set
  }

  // Parse the cookie string
  // Format: name=value; Domain=domain; Path=path; Secure; HttpOnly; SameSite=value
  const parts = cookieValue.split(";");
  if (parts.length === 0) {
    return cookieValue;
  }

  // The first part is the cookie name=value pair
  const cookiePair = parts[0]?.trim() || "";
  let domainFound = false;
  const newParts: string[] = [];

  // Always include the cookie name=value pair
  newParts.push(cookiePair);

  // Process the rest of the attributes
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]?.trim() || "";
    if (!part) {
      continue;
    }

    // Check if this is a Domain attribute
    if (part.toLowerCase().startsWith("domain=")) {
      // Replace the domain
      newParts.push(`Domain=${overrideDomain}`);
      domainFound = true;
    } else {
      // Keep other attributes as-is
      newParts.push(part);
    }
  }

  // If domain wasn't found, add it
  if (!domainFound) {
    newParts.push(`Domain=${overrideDomain}`);
  }

  return newParts.join("; ");
}

// getClientIP extracts the real client IP from the request
function getClientIP(request: FastifyRequest): string {
  // Check X-Forwarded-For header
  const xff = request.headers["x-forwarded-for"];
  if (xff) {
    const ips = (Array.isArray(xff) ? xff[0] : xff || "")?.split(",") || [];
    if (ips.length > 0) {
      return ips[0]?.trim() || "";
    }
  }

  // Check X-Real-IP header
  const xri = request.headers["x-real-ip"];
  if (xri) {
    return (Array.isArray(xri) ? xri[0] : xri || "") as string;
  }

  // Fall back to RemoteAddress
  const remoteAddress = request.socket.remoteAddress;
  if (remoteAddress) {
    // Remove IPv6 prefix if present
    return remoteAddress.replace(/^::ffff:/, "");
  }

  return "unknown";
}

// logProxyRequest logs proxy requests for monitoring and security analysis
function logProxyRequest(
  request: FastifyRequest,
  targetURL: string,
  method: string,
  success: boolean,
  errorMsg: string,
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    user_id: "anonymous",
    username: "anonymous",
    client_ip: getClientIP(request),
    user_agent: request.headers["user-agent"] || "",
    target_url: targetURL,
    method: method,
    success: success,
    error_message: errorMsg,
  };

  console.log(`PROXY_REQUEST: ${JSON.stringify(logData)}`);
}

// ProxyHandler handles HTTP proxy requests - validates URL and forwards the request
async function proxyHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Get target URL from query parameters
  const queryParams = request.query as Record<
    string,
    string | string[] | undefined
  >;
  const targetURL =
    typeof queryParams.url === "string" ? queryParams.url : undefined;

  // Validate required fields
  if (!targetURL) {
    logProxyRequest(request, "", "", false, "URL is required");
    await reply.send({
      success: false,
      message: "URL is required in query parameter 'url'",
    });
    return;
  }

  // Extract all other query parameters (excluding 'url')
  const otherQueryParams: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(queryParams)) {
    if (key !== "url" && value !== undefined) {
      otherQueryParams[key] = value;
    }
  }

  // Merge other query parameters into the target URL
  let finalTargetURL = targetURL;
  if (Object.keys(otherQueryParams).length > 0) {
    try {
      const urlObj = new URL(targetURL);
      // Add query parameters to the target URL
      for (const [key, value] of Object.entries(otherQueryParams)) {
        if (Array.isArray(value)) {
          // Handle array values (multiple values for same key)
          for (const val of value) {
            urlObj.searchParams.append(key, val);
          }
        } else {
          urlObj.searchParams.append(key, value);
        }
      }
      finalTargetURL = urlObj.toString();
    } catch (error) {
      // If URL parsing fails, log and continue with original URL
      logProxyRequest(
        request,
        targetURL,
        request.method,
        false,
        "Failed to parse target URL for query parameter merging",
      );
    }
  }

  // Use the incoming request's HTTP method
  const methodUpper = request.method.toUpperCase();

  // Validate HTTP method
  const validMethods = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
  ];
  if (!validMethods.includes(methodUpper)) {
    logProxyRequest(
      request,
      targetURL,
      methodUpper,
      false,
      "Invalid HTTP method",
    );
    await reply.send({
      success: false,
      message: "Invalid HTTP method",
    });
    return;
  }

  // Validate the target URL domain (use original URL for validation, before query params)
  const isValid = await isValidDomain(targetURL);
  if (!isValid) {
    logProxyRequest(
      request,
      targetURL,
      methodUpper,
      false,
      "URL validation failed",
    );
    await reply.send({
      success: false,
      message: "URL validation failed",
    });
    return;
  }

  // Create HTTP client and make the request
  try {
    // Sanitize and set headers from the incoming request
    // Convert Fastify headers to a simple object
    const incomingHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(request.headers)) {
      if (value) {
        incomingHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
      }
    }

    const sanitizedHeaders = sanitizeHeaders(incomingHeaders);

    // Prepare headers for fetch
    const fetchHeaders: Record<string, string> = { ...sanitizedHeaders };

    // Forward cookies from the original incoming HTTP request to the upstream
    const incomingCookies = request.headers.cookie;
    if (incomingCookies) {
      fetchHeaders["Cookie"] = Array.isArray(incomingCookies)
        ? incomingCookies.join("; ")
        : incomingCookies;
    }

    // Create the request
    const fetchOptions: RequestInit = {
      method: methodUpper,
      headers: fetchHeaders,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    };

    // Add body if present
    // Methods that typically don't have bodies: GET, HEAD, OPTIONS
    // POST, PUT, PATCH, DELETE can have bodies
    const methodsWithoutBody = ["GET", "HEAD", "OPTIONS"];
    if (!methodsWithoutBody.includes(methodUpper) && request.body) {
      // Get body as raw buffer/string
      const body = request.body;
      if (typeof body === "string") {
        fetchOptions.body = body;
      } else if (body instanceof Buffer) {
        fetchOptions.body = body;
      } else if (body instanceof Uint8Array) {
        // Convert Uint8Array to Buffer for fetch
        fetchOptions.body = Buffer.from(body);
      } else {
        // If it's an object, stringify it
        fetchOptions.body = JSON.stringify(body);
      }
    }

    // Execute the request (use finalTargetURL which includes merged query params)
    const resp = await fetch(finalTargetURL, fetchOptions);

    // Read the response body with size limit (skip for HEAD requests and when no body)
    let bodyBuffer: Buffer | undefined;
    // HEAD requests don't have response bodies, and some responses may not have a body
    if (methodUpper !== "HEAD" && resp.body) {
      // Read body with size limit
      const chunks: Uint8Array[] = [];
      let totalSize = 0;
      const reader = resp.body.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          totalSize += value.length;
          if (totalSize > MaxResponseSize) {
            reader.cancel();
            logProxyRequest(
              request,
              finalTargetURL,
              methodUpper,
              false,
              "Response too large",
            );
            await reply.send({
              success: false,
              message: "Response too large",
            });
            return;
          }

          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      // Combine chunks into a Buffer to preserve binary data
      if (chunks.length > 0) {
        const bodyBytes = new Uint8Array(totalSize);
        let offset = 0;
        for (const chunk of chunks) {
          bodyBytes.set(chunk, offset);
          offset += chunk.length;
        }

        // Convert to Buffer to preserve binary data (PDFs, images, ZIPs, etc.)
        bodyBuffer = Buffer.from(bodyBytes);
      }
    }

    // Get cookie domain override from environment variable
    const cookieDomainOverride = config.COOKIE_DOMAIN;

    // Copy headers from target server response to proxy response
    // Skip certain headers that should be set by the proxy itself
    const skipHeaders = new Set([
      "content-length", // Fastify will set this automatically
      "transfer-encoding",
      "connection",
      "upgrade",
      "access-control-allow-origin", // CORS headers are managed by CORS middleware
      "access-control-allow-methods",
      "access-control-allow-headers",
      "access-control-allow-credentials",
      "access-control-expose-headers",
      "access-control-max-age",
    ]);

    // Collect Set-Cookie headers to handle them specially (multiple cookies need array)
    const setCookieValues: string[] = [];
    let setCookieHandled = false;

    // Handle Set-Cookie headers specially - collect all of them
    if (resp.headers.getSetCookie) {
      const cookieValues = resp.headers.getSetCookie();

      if (cookieDomainOverride) {
        // Apply domain override to each cookie
        for (const cookieValue of cookieValues) {
          const modifiedCookie = overrideCookieDomain(
            cookieValue,
            cookieDomainOverride,
          );
          setCookieValues.push(modifiedCookie);
        }
      } else {
        // No override, forward cookies as-is
        setCookieValues.push(...cookieValues);
      }

      // Set all Set-Cookie headers at once using raw.setHeader (accepts array)
      if (setCookieValues.length > 0) {
        reply.raw.setHeader("Set-Cookie", setCookieValues);
        setCookieHandled = true;
      }
    }

    // Iterate through all headers
    for (const [key, value] of resp.headers.entries()) {
      if (!skipHeaders.has(key.toLowerCase())) {
        // Skip Set-Cookie if we already handled it above
        if (key.toLowerCase() === "set-cookie" && setCookieHandled) {
          continue;
        }
        // Set header - entries() already gives us the value
        reply.header(key, value);
      }
    }

    // Log successful request
    logProxyRequest(request, finalTargetURL, methodUpper, true, "");

    // Return the response as-is with the status code from the target server
    // Send Buffer directly to preserve binary data (PDFs, images, ZIPs, etc.)
    await reply.code(resp.status).send(bodyBuffer ?? "");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Request execution failed";
    logProxyRequest(
      request,
      finalTargetURL || targetURL,
      methodUpper,
      false,
      errorMessage,
    );
    await reply.send({
      success: false,
      message: errorMessage,
    });
  }
}

export async function proxyRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * ALL /proxy?url=<target_url>&[other_params...]
   * Proxy HTTP requests to allowed domains
   * Supports all HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
   * Target URL is provided as query parameter 'url'
   * Additional query parameters are forwarded to the target URL (e.g., pagination params)
   * Headers and body are forwarded from the incoming request
   *
   * Example:
   *   GET /proxy?url=https://api.example.com/users&page=1&limit=10
   *   Will forward: GET https://api.example.com/users?page=1&limit=10
   */
  fastify.all(
    "/proxy",
    {
      bodyLimit: MaxRequestSize, // Limit request body size to 1MB
      schema: {
        querystring: {
          type: "object",
          required: ["url"],
          properties: {
            url: { type: "string" },
            // Allow any additional query parameters (pagination, filters, etc.)
            // Fastify will accept any additional properties
          },
          additionalProperties: true,
        },
      },
    },
    proxyHandler,
  );
}
