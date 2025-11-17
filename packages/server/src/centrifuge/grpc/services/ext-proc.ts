import * as grpc from "@grpc/grpc-js";
import { AuthProxy } from "../../auth-proxy";

interface AuthResult {
  valid: boolean;
  user?: {
    id: number;
    email: string;
    name: string;
    role?: string[];
    verified?: boolean;
  };
  error?: string;
}

interface ProcessingRequest {
  request_headers?: {
    headers: { [key: string]: string };
    end_of_stream: boolean;
  };
  request_body?: {
    body: Buffer;
    end_of_stream: boolean;
  };
  response_headers?: {
    headers: { [key: string]: string };
    end_of_stream: boolean;
  };
  response_body?: {
    body: Buffer;
    end_of_stream: boolean;
  };
}

interface ProcessingResponse {
  request_headers?: {
    response: {
      status: number; // 0 = CONTINUE, 1 = CONTINUE_AND_REPLACE
      header_mutation?: {
        set_headers: Array<{ header: string; value: string; append: boolean }>;
        remove_headers: string[];
      };
      body_mutation?: {
        body: Buffer;
        clear_body: boolean;
      };
    };
  };
  response_headers?: {
    response: {
      status: number;
      header_mutation?: {
        set_headers: Array<{ header: string; value: string; append: boolean }>;
        remove_headers: string[];
      };
    };
  };
  request_body?: {
    response: {
      status: number; // 0 = CONTINUE, 1 = CONTINUE_AND_REPLACE
      header_mutation?: {
        set_headers: Array<{ header: string; value: string; append: boolean }>;
        remove_headers: string[];
      };
      body_mutation?: {
        body: Buffer;
        clear_body: boolean;
      };
    };
  };
  response_body?: {
    response: {
      status: number; // 0 = CONTINUE, 1 = CONTINUE_AND_REPLACE
      header_mutation?: {
        set_headers: Array<{ header: string; value: string; append: boolean }>;
        remove_headers: string[];
      };
      body_mutation?: {
        body: Buffer;
        clear_body: boolean;
      };
    };
  };
  immediate_response?: {
    status: number;
    headers: { [key: string]: string };
    body: string;
    grpc_status: { status: number };
    details: string;
  };
}

export function createExtProcService(authProxy: AuthProxy) {
  return {
    Process: (
      call: grpc.ServerDuplexStream<ProcessingRequest, ProcessingResponse>,
    ) => {
      console.log("🔄 New gRPC ext_proc stream started");

      let requestHeaders: { [key: string]: string } = {};
      let authResult: AuthResult | null = null;
      let clientId: string | null = null;

      call.on("data", async (request: ProcessingRequest) => {
        try {
          // Handle request headers phase
          if (request.request_headers) {
            console.log("📥 Processing request headers");
            requestHeaders = request.request_headers.headers;

            // Log relevant headers for debugging
            console.log("Headers:", {
              host: requestHeaders.host,
              userAgent: requestHeaders["user-agent"],
              authorization: requestHeaders.authorization
                ? "[REDACTED]"
                : "none",
              customAuth: requestHeaders["x-custom-auth"]
                ? "[REDACTED]"
                : "none",
              path: requestHeaders[":path"] || requestHeaders.path,
              method: requestHeaders[":method"] || requestHeaders.method,
            });

            // Perform authentication
            const token =
              requestHeaders["x-custom-auth"] ||
              requestHeaders["authorization"]?.replace("Bearer ", "") ||
              extractTokenFromCookie(requestHeaders["cookie"] || "");

            if (token) {
              console.log("🔐 Validating token via auth proxy");
              authResult = await authProxy.validateToken(token);

              if (authResult.valid && authResult.user) {
                console.log(
                  `✅ User authenticated: ${authResult.user.email} (ID: ${authResult.user.id})`,
                );

                // Generate client ID for WebSocket connection tracking
                clientId = `user_${authResult.user.id}_${Date.now()}`;

                // Respond with authentication headers
                const response: ProcessingResponse = {
                  request_headers: {
                    response: {
                      status: 1, // CONTINUE_AND_REPLACE
                      header_mutation: {
                        set_headers: [
                          {
                            header: "x-auth-validated",
                            value: "true",
                            append: false,
                          },
                          {
                            header: "x-auth-user-id",
                            value: authResult.user.id.toString(),
                            append: false,
                          },
                          {
                            header: "x-auth-user-email",
                            value: authResult.user.email,
                            append: false,
                          },
                          {
                            header: "x-client-id",
                            value: clientId,
                            append: false,
                          },
                          {
                            header: "x-validation-method",
                            value: "centrifuge-grpc",
                            append: false,
                          },
                          {
                            header: "x-validation-timestamp",
                            value: Date.now().toString(),
                            append: false,
                          },
                        ],
                        remove_headers: ["x-custom-auth"], // Remove original token for security
                      },
                    },
                  },
                };

                call.write(response);
                return;
              } else {
                console.warn("❌ Authentication failed:", authResult.error);
              }
            } else {
              console.log("ℹ️ No authentication token provided");
            }

            // Check if this is a public path (health check, static assets, etc.)
            const path = requestHeaders[":path"] || requestHeaders.path || "";
            if (isPublicPath(path)) {
              console.log(`🌐 Public path allowed: ${path}`);
              const response: ProcessingResponse = {
                request_headers: {
                  response: {
                    status: 0, // CONTINUE
                  },
                },
              };
              call.write(response);
              return;
            }

            // Authentication required but failed
            console.warn(`🚫 Access denied for path: ${path}`);
            const response: ProcessingResponse = {
              immediate_response: {
                status: 401,
                headers: {
                  "content-type": "application/json",
                  "x-auth-error": "authentication-required",
                },
                body: JSON.stringify({
                  error: "Authentication required",
                  supportedMethods: ["x-custom-auth", "Authorization Bearer"],
                  timestamp: new Date().toISOString(),
                }),
                grpc_status: { status: 0 },
                details: "Authentication required for this resource",
              },
            };
            call.write(response);
            return;
          }

          // Handle response headers phase
          if (request.response_headers) {
            console.log("📤 Processing response headers");

            // Add response tracking headers if user is authenticated
            if (authResult?.valid && authResult.user) {
              const response: ProcessingResponse = {
                response_headers: {
                  response: {
                    status: 1, // CONTINUE_AND_REPLACE
                    header_mutation: {
                      set_headers: [
                        {
                          header: "x-server-processed-by",
                          value: "centrifuge-grpc",
                          append: false,
                        },
                        {
                          header: "x-processing-time",
                          value: Date.now().toString(),
                          append: false,
                        },
                      ],
                      remove_headers: [], // Don't remove any response headers
                    },
                  },
                },
              };
              call.write(response);
            } else {
              // Just continue without modification
              const response: ProcessingResponse = {
                response_headers: {
                  response: {
                    status: 0, // CONTINUE
                  },
                },
              };
              call.write(response);
            }
            return;
          }

          // Handle request body (if needed for POST/PUT operations)
          if (request.request_body) {
            console.log("📄 Processing request body");
            // For now, just continue - could add body validation here
            const response: ProcessingResponse = {
              request_body: {
                response: {
                  status: 0, // CONTINUE
                },
              },
            };
            call.write(response);
            return;
          }

          // Handle response body (if needed for response modification)
          if (request.response_body) {
            console.log("📋 Processing response body");
            // For now, just continue - could add response modification here
            const response: ProcessingResponse = {
              response_body: {
                response: {
                  status: 0, // CONTINUE
                },
              },
            };
            call.write(response);
            return;
          }
        } catch (error) {
          console.error("❌ Error processing ext_proc request:", error);

          // Send error response
          const response: ProcessingResponse = {
            immediate_response: {
              status: 500,
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({
                error: "Internal processing error",
                timestamp: new Date().toISOString(),
              }),
              grpc_status: { status: 13 }, // INTERNAL
              details: "External processing service error",
            },
          };
          call.write(response);
        }
      });

      call.on("end", () => {
        console.log("🔚 gRPC ext_proc stream ended");
        call.end();
      });

      call.on("error", (error: Error) => {
        console.error("💥 gRPC ext_proc stream error:", error);
      });

      call.on("cancelled", () => {
        console.log("🚫 gRPC ext_proc stream cancelled");
      });
    },
  };
}

function extractTokenFromCookie(cookieHeader: string): string | null {
  if (!cookieHeader) return null;

  const cookies: { [key: string]: string } = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });

  // Check for JWT tokens in cookies
  return cookies.accessToken || cookies.refreshToken || null;
}

function isPublicPath(path: string): boolean {
  const publicPaths = [
    "/health",
    "/metrics",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/auth/register",
    "/auth/login",
    "/auth/logout",
    "/auth/refresh",
  ];

  const publicPrefixes = ["/static/", "/assets/", "/api/public/", "/_next/"];

  // Exact matches
  if (publicPaths.includes(path)) {
    return true;
  }

  // Prefix matches
  for (const prefix of publicPrefixes) {
    if (path.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}
