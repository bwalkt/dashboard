import * as grpc from "@grpc/grpc-js";
import type {
  AuthResult,
  ProcessingRequest,
  ProcessingResponse,
} from "@pzero/shared/grpc";
import {
  createAuthHeaders,
  createResponseTrackingHeaders,
  extractTokenFromCookie,
  GrpcStatus,
  isPublicPath,
  ProcessingStatus,
} from "@pzero/shared/grpc";
import { AuthProxy } from "../../auth-proxy";

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
                      status: ProcessingStatus.CONTINUE_AND_REPLACE,
                      header_mutation: {
                        set_headers: createAuthHeaders(
                          authResult.user.id,
                          authResult.user.email,
                        ),
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
                    status: ProcessingStatus.CONTINUE,
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
                grpc_status: { status: GrpcStatus.OK },
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
                    status: ProcessingStatus.CONTINUE_AND_REPLACE,
                    header_mutation: {
                      set_headers: createResponseTrackingHeaders(),
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
                    status: ProcessingStatus.CONTINUE,
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
              grpc_status: { status: GrpcStatus.INTERNAL },
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

// These utility functions are now imported from @pzero/shared/grpc
