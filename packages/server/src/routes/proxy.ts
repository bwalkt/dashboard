import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { constructProxyURL } from "../services/proxy.service.js";
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
      let abortSignal: AbortSignal | null = null;
      let response: Response | null = null;

      try {
        // Construct proxy URL - can throw validation errors
        const url = constructProxyURL(request);
        
        // Build headers: filter undefined values and convert arrays to comma-separated strings
        const reqHeaders = Object.entries(request.headers)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v]);
        const headers = new Headers(reqHeaders as [string, string][]);
        const cookies = request.headers.cookie;
       
        if (cookies) {
          headers.set('Cookie', cookies);
        }

        // Create abort signal for timeout handling
        abortSignal = AbortSignal.timeout(30000); // 30 second timeout

        const fetchOptions: RequestInit = {
          method: request.method,
          headers: headers,
          credentials: 'include',
          signal: abortSignal,
        };

        if (request.body) {
          fetchOptions.body = request.body as BodyInit | null;
        }

        // Fetch can throw network errors, DNS errors, or timeout (AbortError)
        response = await fetch(url, fetchOptions);

        // Handle response body based on content type
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          // JSON response - parse and send via Fastify
          try {
            const jsonData = await response.json();
            
            // Copy response headers
            const responseHeaders = response.headers.entries();
            for (const [key, value] of responseHeaders) {
              reply.header(key, value);
            }
            
            return reply.status(response.status).send(jsonData);
          } catch (jsonError) {
            // JSON parsing failed - log and return error
            console.error('Failed to parse JSON response from proxy target:', {
              url,
              status: response.status,
              contentType,
              error: jsonError instanceof Error ? jsonError.message : String(jsonError),
            });
            return reply.status(502).send({
              error: 'Bad Gateway',
              message: 'Invalid JSON response from upstream server',
            });
          }
        } else {
          // Non-JSON response - consume body and write to reply.raw
          try {
            // Consume the response body as ArrayBuffer
            const bodyBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(bodyBuffer);

            // Set status code on raw response
            reply.raw.statusCode = response.status;

            // Copy response headers to raw response
            const responseHeaders = response.headers.entries();
            for (const [key, value] of responseHeaders) {
              // Skip headers that Node.js handles automatically
              const lowerKey = key.toLowerCase();
              if (lowerKey !== 'transfer-encoding' && lowerKey !== 'connection') {
                reply.raw.setHeader(key, value);
              }
            }

            // Write the buffer to raw response and end
            reply.raw.write(buffer);
            reply.raw.end();
            
            // Return to prevent Fastify from sending another response
            return;
          } catch (bodyError) {
            // Error consuming or writing body
            console.error('Failed to consume or write non-JSON response body:', {
              url,
              status: response.status,
              contentType,
              error: bodyError instanceof Error ? bodyError.message : String(bodyError),
            });
            return reply.status(502).send({
              error: 'Bad Gateway',
              message: 'Failed to process upstream server response',
            });
          }
        }
      } catch (error) {
        // Note: AbortSignal.timeout() automatically aborts on timeout
        // No manual abort needed - the signal is already handled by fetch

        // Determine error type and map to appropriate status code
        let statusCode: number;
        let errorMessage: string;
        let logContext: Record<string, unknown> = {
          method: request.method,
          url: request.url,
          error: error instanceof Error ? error.message : String(error),
        };

        if (error instanceof Error) {
          // URL/validation errors from constructProxyURL
          if (
            error.message.includes('Proxy target') ||
            error.message.includes('required') ||
            error.message.includes('must be a string') ||
            error instanceof TypeError // URL parsing errors
          ) {
            statusCode = 400;
            errorMessage = 'Invalid proxy request: ' + error.message;
            logContext.errorType = 'validation';
          }
          // Timeout errors (AbortError)
          else if (error.name === 'AbortError' || error.message.includes('timeout')) {
            statusCode = 504;
            errorMessage = 'Gateway timeout: Request to upstream server timed out';
            logContext.errorType = 'timeout';
          }
          // DNS errors
          else if (
            error.message.includes('getaddrinfo') ||
            error.message.includes('ENOTFOUND') ||
            error.message.includes('DNS')
          ) {
            statusCode = 502;
            errorMessage = 'Bad Gateway: Unable to resolve upstream server hostname';
            logContext.errorType = 'dns';
          }
          // Network/connection errors
          else if (
            error.message.includes('ECONNREFUSED') ||
            error.message.includes('ECONNRESET') ||
            error.message.includes('network') ||
            error.message.includes('fetch failed')
          ) {
            statusCode = 502;
            errorMessage = 'Bad Gateway: Unable to connect to upstream server';
            logContext.errorType = 'network';
          }
          // Other fetch errors (upstream server errors)
          else {
            statusCode = 503;
            errorMessage = 'Service Unavailable: Upstream server error';
            logContext.errorType = 'upstream';
          }

          // Include stack trace in logs for debugging
          if (error.stack) {
            logContext.stack = error.stack;
          }
        } else {
          // Unexpected error type
          statusCode = 500;
          errorMessage = 'Internal Server Error: Unexpected error occurred';
          logContext.errorType = 'unknown';
        }

        // Log error with full context
        console.error('Proxy request failed:', logContext);

        // Return safe JSON error response
        return reply.status(statusCode).send({
          error: statusCode === 400 ? 'Bad Request' : 
                 statusCode === 502 ? 'Bad Gateway' :
                 statusCode === 503 ? 'Service Unavailable' :
                 statusCode === 504 ? 'Gateway Timeout' : 'Internal Server Error',
          message: errorMessage,
        });
      }
    },
  );
}
