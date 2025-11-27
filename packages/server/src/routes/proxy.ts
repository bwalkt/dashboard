import { lookup } from "dns/promises";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { parse as parseQuery } from "querystring";
import { config } from "../config/env";
import { constructProxyURL } from "../services/proxy.service";
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
    "/proxy/*",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const url = constructProxyURL(request);
      const reqHeaders = Object.entries(request.headers);
      const headers = new Headers(reqHeaders.map(([key, value]) => [key, value as string]));
      const cookies = request.headers.cookie;
     
      if (cookies) {
        headers.set('Cookie', cookies);
      }
      const fetchOptions: RequestInit = {
        method: request.method,
        headers: headers,
        credentials: 'include',
        signal: AbortSignal.timeout(30000), // 30 second timeout
      };
      if (request.body) {
        fetchOptions.body = request.body as BodyInit | null;
      }
      const response = await fetch(url, fetchOptions);
      const responseHeaders = response.headers.entries()
      for (const [key, value] of responseHeaders) {
        reply.header(key, value);
      }

       if(response.headers.get('content-type')?.includes('application/json')) {
        reply.status(response.status).send(await response.json());
      } else {
        reply.status(response.status).send(response.body);
      }
    },
  );
}
