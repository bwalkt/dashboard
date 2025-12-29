import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config/env.js";
import { authService } from "../services/auth.service.js";
import { FilterAuthService } from "../services/filter-auth.service.js";
import { filterCentrifugoService } from "../services/filter-centrifugo.service.js";

// FilterAuthService uses static methods

// Centrifugo proxy endpoints for authentication and authorization
export async function centrifugoRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  // Connect proxy - called when client connects to Centrifugo
  fastify.post(
    "/centrifugo/connect",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as any;
        const token = body.token;

        if (!token) {
          return reply.status(200).send({
            disconnect: {
              code: 4001,
              reason: "Authentication required",
            },
          });
        }

        // Validate token
        const authResult = await authService.validateToken(token);

        if (!authResult.valid || !authResult.user) {
          return reply.status(200).send({
            disconnect: {
              code: 4002,
              reason: "Invalid authentication token",
            },
          });
        }

        // Allow connection with user context
        return reply.status(200).send({
          result: {
            user: authResult.user.id.toString(),
            data: {
              user_id: authResult.user.id,
              email: authResult.user.email,
              name: authResult.user.name,
              verified: authResult.user.verified || false,
            },
          },
        });
      } catch (error) {
        console.error("Centrifugo connect error:", error);
        return reply.status(200).send({
          disconnect: {
            code: 4003,
            reason: "Authentication service error",
          },
        });
      }
    },
  );

  // Refresh proxy - called when client token needs refresh
  fastify.post(
    "/centrifugo/refresh",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as any;
        const token = body.token;

        if (!token) {
          return reply.status(200).send({
            disconnect: {
              code: 4001,
              reason: "Token refresh required",
            },
          });
        }

        // Validate refresh token
        const authResult = await authService.validateToken(token);

        if (!authResult.valid || !authResult.user) {
          return reply.status(200).send({
            disconnect: {
              code: 4002,
              reason: "Invalid refresh token",
            },
          });
        }

        // Token is still valid
        return reply.status(200).send({
          result: {
            user: authResult.user.id.toString(),
            expired: false,
          },
        });
      } catch (error) {
        console.error("Centrifugo refresh error:", error);
        return reply.status(200).send({
          disconnect: {
            code: 4003,
            reason: "Token refresh failed",
          },
        });
      }
    },
  );

  // Subscribe proxy - called when client subscribes to channel
  fastify.post(
    "/centrifugo/subscribe",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as any;
        const channel = body.channel;
        const user = body.user; // User ID from Centrifugo

        if (!user || !channel) {
          return reply.status(200).send({
            disconnect: {
              code: 4004,
              reason: "Missing user or channel information",
            },
          });
        }

        // Channel authorization logic
        const authorized = await authorizeChannelAccess(
          user,
          channel,
          "subscribe",
        );

        if (!authorized) {
          return reply.status(200).send({
            disconnect: {
              code: 4005,
              reason: "Not authorized for this channel",
            },
          });
        }

        // Allow subscription
        return reply.status(200).send({
          result: {},
        });
      } catch (error) {
        console.error("Centrifugo subscribe error:", error);
        return reply.status(200).send({
          disconnect: {
            code: 4006,
            reason: "Channel authorization failed",
          },
        });
      }
    },
  );

  // Publish proxy - called when client publishes to channel
  fastify.post(
    "/centrifugo/publish",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as any;
        const channel = body.channel;
        const user = body.user; // User ID from Centrifugo
        const data = body.data;

        if (!user || !channel) {
          return reply.status(200).send({
            disconnect: {
              code: 4007,
              reason: "Missing user or channel information",
            },
          });
        }

        // Channel publish authorization
        const authorized = await authorizeChannelAccess(
          user,
          channel,
          "publish",
        );

        if (!authorized) {
          return reply.status(200).send({
            disconnect: {
              code: 4008,
              reason: "Not authorized to publish to this channel",
            },
          });
        }

        // Allow publishing
        console.log(`📤 User ${user} published to ${channel}:`, data);
        return reply.status(200).send({
          result: {},
        });
      } catch (error) {
        console.error("Centrifugo publish error:", error);
        return reply.status(200).send({
          disconnect: {
            code: 4009,
            reason: "Publish authorization failed",
          },
        });
      }
    },
  );

  // Special connect proxy for filter authentication
  fastify.post(
    "/centrifugo/filter-connect",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as any;
        const authToken = body.token; // Filter auth token
        
        if (!authToken || typeof authToken !== 'object') {
          return reply.status(200).send({
            disconnect: {
              code: 5001,
              reason: "Filter authentication required",
            },
          });
        }

        // Validate filter authentication token
        const authResult = await FilterAuthService.validateAuthToken(authToken);

        if (!authResult.valid) {
          return reply.status(200).send({
            disconnect: {
              code: 5002,
              reason: `Filter authentication failed: ${authResult.reason}`,
            },
          });
        }

        // Generate stable filter user ID for Centrifugo
        const filterUserId = `filter:${authToken.filterId}`;

        // Allow connection with filter context
        return reply.status(200).send({
          result: {
            user: filterUserId,
            data: {
              type: "envoy-wasm-filter",
              filterId: authToken.filterId,
              authenticatedAt: Date.now(),
            },
          },
        });
      } catch (error) {
        console.error("Filter Centrifugo connect error:", error);
        return reply.status(200).send({
          disconnect: {
            code: 5003,
            reason: "Filter authentication service error",
          },
        });
      }
    },
  );

  // Handle filter messages received via Centrifugo
  fastify.post(
    "/centrifugo/filter-message",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as any;
        const { message, channel, user } = body;
        
        if (!message || !channel || !user) {
          return reply.status(400).send({ error: "Missing required fields" });
        }

        // Validate that this is from a filter user
        if (!user.startsWith("filter:")) {
          return reply.status(403).send({ error: "Unauthorized: not a filter user" });
        }

        // Validate signed message
        const validationResult = await FilterAuthService.validateSignedMessage(message);
        
        if (!validationResult.valid) {
          console.warn(`Invalid filter message: ${validationResult.reason}`);
          return reply.status(400).send({ error: `Invalid message: ${validationResult.reason}` });
        }

        // Extract filter info from validated message
        const { filterId, instanceId } = message;
        
        // Handle the message
        await filterCentrifugoService.handleFilterRequest(filterId, instanceId, validationResult.data);

        return reply.status(200).send({ success: true });
      } catch (error) {
        console.error("Filter message handling error:", error);
        return reply.status(500).send({ error: "Message processing failed" });
      }
    },
  );

  // Get filter statistics endpoint (requires authentication)
  fastify.get("/centrifugo/filter-stats", async (request, reply) => {
    try {
      // Authenticate admin user before returning sensitive statistics
      const apiKey = request.headers['x-api-key'] as string;
      const authHeader = request.headers['authorization'] as string;
      const filterToken = request.headers['x-filter-token'] as string;

      // Check API key authentication
      if (apiKey) {
        // Use separate STATS_API_KEY for security, fallback to JWT_SECRET for backward compatibility
        const validApiKey = config.STATS_API_KEY || config.JWT_SECRET;
        if (apiKey !== validApiKey) {
          reply.code(401);
          return { error: "Invalid API key" };
        }
        
        // Log security warning if using JWT_SECRET as fallback
        if (!config.STATS_API_KEY) {
          console.warn("⚠️ Using JWT_SECRET as stats API key. Consider setting STATS_API_KEY for better security separation.");
        }
      }
      // Check JWT authentication
      else if (authHeader) {
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
        try {
          const authResult = await authService.validateToken(token);
          if (!authResult.valid) {
            reply.code(401);
            return { error: "Invalid authentication token" };
          }
          // Optional: Check if user has admin privileges
          // const user = authResult.user;
          // if (!user.isAdmin) {
          //   reply.code(403);
          //   return { error: "Admin privileges required" };
          // }
        } catch (authError) {
          console.error("JWT validation error:", authError);
          reply.code(401);
          return { error: "Token validation failed" };
        }
      }
      // Check filter token authentication (for internal filter access)
      else if (filterToken) {
        try {
          const tokenData = JSON.parse(Buffer.from(filterToken, 'base64').toString());
          const result = await FilterAuthService.validateAuthToken(tokenData);
          if (!result.valid) {
            reply.code(401);
            return { error: `Filter authentication failed: ${result.reason}` };
          }
        } catch (filterAuthError) {
          console.error("Filter token validation error:", filterAuthError);
          reply.code(401);
          return { error: "Invalid filter token" };
        }
      }
      // No authentication provided
      else {
        reply.code(401);
        return { error: "Authentication required. Provide x-api-key, Authorization header, or x-filter-token" };
      }

      const stats = await filterCentrifugoService.getFilterStatistics();
      return { success: true, stats };
    } catch (error) {
      console.error("Error getting filter stats:", error);
      reply.code(500);
      return { error: "Failed to get filter statistics" };
    }
  });
}

// Channel authorization helper
async function authorizeChannelAccess(
  userId: string,
  channel: string,
  action: "subscribe" | "publish",
): Promise<boolean> {
  try {
    // Public channels (anyone can subscribe)
    if (channel.startsWith("public:")) {
      return true;
    }

    // Personal channels (user:123)
    if (channel.startsWith("personal:")) {
      const channelUserId = channel.split(":")[1];
      return channelUserId === userId;
    }

    // Notification channels (notifications:123)
    if (channel.startsWith("notifications:")) {
      const channelUserId = channel.split(":")[1];
      // Only allow subscribing to your own notifications
      return action === "subscribe" && channelUserId === userId;
    }

    // Admin channels
    if (channel.startsWith("admin:")) {
      // TODO: Check user role from database
      // For now, deny all admin access
      return false;
    }

    // Filter channels (special handling for envoy-wasm-filter)
    if (channel.startsWith("filter:")) {
      // Only allow filter communication if it's from authenticated filter
      return await isAuthenticatedFilter(userId);
    }

    // Default deny for unknown channels
    console.warn(`Unknown channel pattern: ${channel}`);
    return false;
  } catch (error) {
    console.error(`Error authorizing ${action} on channel ${channel}:`, error);
    return false;
  }
}

// Helper function to check if userId represents an authenticated filter
async function isAuthenticatedFilter(userId: string): Promise<boolean> {
  try {
    // Filter user IDs follow pattern: "filter:filterId"
    if (!userId.startsWith("filter:")) {
      return false;
    }

    const parts = userId.split(":");
    if (parts.length < 2) {
      return false;
    }

    const filterId = parts[1];
    if (!filterId) {
      return false;
    }
    
    // Direct lookup for better performance - O(1) instead of O(n)
    return await FilterAuthService.isFilterActive(filterId);
  } catch (error) {
    console.error("Error checking filter authentication:", error);
    return false;
  }
}
