import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config/env";

// Simple pass-through gateway to sfdc-vanilla-server
// This acts as a header validation gateway that forwards requests after authentication

const SFDC_SERVER_BASE_URL = "http://localhost:8080";

async function gatewayHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    // At this point, the header validation middleware has already run
    // and the request is authenticated (or public route)

    // Construct target URL by preserving the path and query parameters
    const targetPath = request.url.replace(/^\/gateway/, "") || "/";
    const targetURL = `${SFDC_SERVER_BASE_URL}${targetPath}`;

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

  console.log(
    "Gateway routes registered - forwarding to",
    SFDC_SERVER_BASE_URL,
  );
}
