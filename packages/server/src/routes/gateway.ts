import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config/env.js";

// Multi-target gateway with header validation and authentication
// Supports multiple backend services through different route prefixes

// Backend services configuration based on URL patterns
const BACKEND_SERVICES = {
  // Default service for explicit gateway routes
  default: "http://localhost:8080", // sfdc-vanilla-server

  // Path-based routing (future expansion)
  // When we move admin functions to separate services:
  // "/auth": "http://localhost:3002",
  // "/billing": "http://localhost:3003",
  // "/api": "http://localhost:3001"
} as const;

// For now, everything defaults to current server (admin portal)
// except explicit /gateway/* routes which go to backend services

async function gatewayHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    // At this point, the header validation middleware has already run
    // and the request is authenticated (or public route)

    // Intelligent routing based on originating URL
    // /gateway/* routes are forwarded to backend services
    // All other routes (/auth, /billing, etc.) stay on current server (admin portal)

    const gatewayPath = request.url.replace(/^\/gateway\/?/, "");
    let targetPath = "/" + gatewayPath;

    // Default to the configured backend service (sfdc-vanilla-server)
    const serviceBaseURL = BACKEND_SERVICES.default;
    const targetURL = `${serviceBaseURL}${targetPath}`;

    console.log(
      `Gateway: Forwarding ${request.method} ${request.url} -> ${targetURL}`,
    );

    // Prepare headers for forwarding (remove hop-by-hop headers)
    const forwardHeaders: Record<string, string> = {};
    const skipHeaders = new Set([
      "host",
      "connection",
      "upgrade",
      "proxy-connection",
      "proxy-authorization",
      "te",
      "trailers",
      "transfer-encoding",
    ]);

    for (const [key, value] of Object.entries(request.headers)) {
      if (!skipHeaders.has(key.toLowerCase()) && value) {
        forwardHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
      }
    }

    // Add authentication info to forwarded headers (optional)
    if (request.user?.authenticated) {
      forwardHeaders["x-gateway-auth"] = "true";
      forwardHeaders["x-gateway-method"] = request.user.method;
      forwardHeaders["x-gateway-target"] = serviceBaseURL;
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: request.method,
      headers: forwardHeaders,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    };

    // Add body for non-GET/HEAD requests
    if (
      !["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase()) &&
      request.body
    ) {
      if (typeof request.body === "string") {
        fetchOptions.body = request.body;
      } else if (request.body instanceof Buffer) {
        fetchOptions.body = request.body;
      } else {
        fetchOptions.body = JSON.stringify(request.body);
      }
    }

    // Make request to target server
    const response = await fetch(targetURL, fetchOptions);

    // Forward response headers (skip certain headers)
    const skipResponseHeaders = new Set([
      "content-length",
      "transfer-encoding",
      "connection",
      "upgrade",
    ]);

    for (const [key, value] of response.headers.entries()) {
      if (!skipResponseHeaders.has(key.toLowerCase())) {
        reply.header(key, value);
      }
    }

    // Get response body
    const responseBody = await response.arrayBuffer();

    // Forward response
    return reply.code(response.status).send(Buffer.from(responseBody));
  } catch (error) {
    console.error("Gateway error:", error);
    return reply.code(502).send({
      error: "Gateway Error",
      message: "Failed to forward request to target server",
    });
  }
}

export async function gatewayRoutes(fastify: FastifyInstance): Promise<void> {
  // Catch-all route that forwards everything to sfdc-vanilla-server
  // The wildcard (*) captures any path after /gateway/
  fastify.all("/gateway/*", gatewayHandler);

  // Also handle /gateway root
  fastify.all("/gateway", gatewayHandler);

  console.log("Gateway routes registered:");
  console.log(`  - /gateway/* → ${BACKEND_SERVICES.default} (backend service)`);
  console.log(
    `  - /auth/*, /billing/*, etc. → localhost:${config.PORT} (admin portal)`,
  );
}
