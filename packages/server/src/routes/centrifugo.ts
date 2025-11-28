import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authService } from "../services/auth.service.js";

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

    // Default deny for unknown channels
    console.warn(`Unknown channel pattern: ${channel}`);
    return false;
  } catch (error) {
    console.error(`Error authorizing ${action} on channel ${channel}:`, error);
    return false;
  }
}
