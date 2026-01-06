
import { generateHandleFromEmail, type User } from "@pzero/shared/pzero";
import { validateEmail } from "@pzero/shared/validator";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../config/database.js";
import { redis } from "../config/redis.js";
import { authenticateToken } from "../middleware/auth.js";
import { onSendHook } from "../middleware/challenge.js";
import { userService } from "../services/user.service.js";

export interface CreateUserPayload {
  name: string;
  email: string;
  handle?: string
  phone?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  org_id?: string;
  tags?: Record<string, any>;
  data?: Record<string, any>;
}

export interface UserWithVerification extends User {
  verification_token?: string;
  verification_expires_at?: string;
}

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/users
   * Create a new user (similar to registration)
   */
  fastify.post(
    "/users",
    {
      preHandler: authenticateToken,
      onSend: onSendHook,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = request.body as CreateUserPayload;

        // Validate required fields
        if (!data.name || !data.email) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Name and email are required",
          });
        }

        // Check if user already exists
        const existingUser = await userService.getUserByEmail(data.email);
        if (existingUser) {
          return reply.status(409).send({
            error: "Conflict",
            message: "User with this email already exists",
          });
        }

        // Create user using existing service
        const user = await userService.createUserFromEmail({
          name: data.name,
          email: data.email,
          email_verified: data.email_verified || false,
          handle: data.handle ?? generateHandleFromEmail(data.email),
        });

        return reply.send(user);
      } catch (error) {
        console.error("Create user error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create user",
        });
      }
    },
  );

  /**
   * POST /api/users/create-verified
   * Create user with automatic verification (for admin-created users)
   */
  fastify.post(
    "/api/users/create-verified",
    {
      preHandler: authenticateToken,
      onSend: onSendHook,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = request.body as CreateUserPayload & { 
          skip_verification?: boolean 
        };

        // Validate required fields
        if (!data.name || !data.email) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Name and email are required",
          });
        }

        // Check if user already exists
        const existingUser = await userService.getUserByEmail(data.email);
        if (existingUser) {
          return reply.status(409).send({
            error: "Conflict",
            message: "User with this email already exists",
          });
        }

        // Create user with email verified by default
        const user = await userService.createUserFromEmail({
          name: data.name,
          email: data.email,
          email_verified: true, // Auto-verify for admin-created users
          handle: data.handle ?? generateHandleFromEmail(data.email)
        });

        return reply.send(user);
      } catch (error) {
        console.error("Create verified user error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create verified user",
        });
      }
    },
  );

  /**
   * GET /api/users
   * Get all users
   */
  fastify.get(
    "/api/users",
    {
      preHandler: authenticateToken,
      onSend: onSendHook,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await db.pool.query(`
          SELECT a.email, a.email_verified, u.handle, u.online_status, u.last_seen, a.phone_verified, a.c_at, a.is_act, a.is_del 
          FROM pzero.all_users u
          JOIN pzero.all_auth a ON u.id = a.id
          ORDER BY u.c_at DESC
        `);

        return reply.send(result.rows);
      } catch (error) {
        console.error("Get users error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch users",
        });
      }
    },
  );

  /**
   * GET /api/users/:id
   * Get user by ID
   */
  fastify.get(
    "/api/users/:id",
    {
      preHandler: authenticateToken,
      onSend: onSendHook,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const user = await userService.getUserById(id);
        if (!user) {
          return reply.status(404).send({
            error: "Not Found",
            message: "User not found",
          });
        }

        return reply.send(user);
      } catch (error) {
        console.error("Get user error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch user",
        });
      }
    },
  );

  /**
   * PUT /api/users/:id
   * Update user
   */
  fastify.put(
    "/api/users/:id",
    {
      preHandler: authenticateToken,
      onSend: onSendHook,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const data = request.body as Partial<CreateUserPayload>;

        const user = await userService.updateUser(id, data);
        if (!user) {
          return reply.status(404).send({
            error: "Not Found",
            message: "User not found",
          });
        }

        return reply.send(user);
      } catch (error) {
        console.error("Update user error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update user",
        });
      }
    },
  );

  /**
   * DELETE /api/users/:id
   * Delete user (soft delete)
   */
  fastify.delete(
    "/api/users/:id",
    {
      preHandler: authenticateToken,
      onSend: onSendHook,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const result = await db.pool.query(
          `UPDATE pzero.all_users 
           SET is_del = true
           WHERE id = $1 AND is_del = false
           RETURNING id`,
          [id]
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            error: "Not Found",
            message: "User not found",
          });
        }

        return reply.status(204).send();
      } catch (error) {
        console.error("Delete user error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete user",
        });
      }
    },
  );

  /**
   * POST /api/users/:id/verify-email
   * Verify user email
   */
  fastify.post(
    "/api/users/:id/verify-email",
    {
      preHandler: authenticateToken,
      onSend: onSendHook,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const { token } = request.body as { token: string };

        // TODO: SECURITY CRITICAL - This endpoint is currently disabled until proper token validation is implemented
        // The token parameter is extracted but not validated, allowing any authenticated user to verify any email
        return reply.status(501).send({
          error: "Not Implemented",
          message: "Email verification endpoint is temporarily disabled due to security concerns. Please contact support for manual verification.",
        });

        // Commented out until proper token validation is implemented:
        // const result = await db.pool.query(
        //   `UPDATE pzero.all_auth 
        //    SET email_verified = true 
        //    WHERE id = $1
        //    RETURNING *`,
        //   [id]
        // );

        // Commented out until proper token validation is implemented:
        // if (result.rows.length === 0) {
        //   return reply.status(404).send({
        //     error: "Not Found",
        //     message: "User not found",
        //   });
        // }

        // return reply.send(result.rows[0]);
      } catch (error) {
        console.error("Verify email error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to verify email",
        });
      }
    },
  );

  /**
   * POST /api/users/:id/mark-verified
   * Manually mark email as verified (admin action)
   * 
   * TODO: SECURITY - Add admin role verification
   * Currently any authenticated user can mark any email as verified.
   * Should be: preHandler: [authenticateToken, requireAdminRole]
   * Waiting for requireAdminRole middleware implementation.
   */
  fastify.post(
    "/api/users/:id/mark-verified",
    {
      preHandler: authenticateToken,
      onSend: onSendHook, // TODO: Add requireAdminRole when available
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const result = await db.pool.query(
          `UPDATE pzero.all_auth 
           SET email_verified = true 
           WHERE id = $1
           RETURNING *`,
          [id]
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            error: "Not Found",
            message: "User not found",
          });
        }

        return reply.send(result.rows[0]);
      } catch (error) {
        console.error("Mark email verified error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to mark email as verified",
        });
      }
    },
  );

  /**
   * POST /api/users/:id/associate-org
   * Associate user with organization
   */
  fastify.post(
    "/api/users/:id/associate-org",
    {
      preHandler: authenticateToken,
      onSend: onSendHook,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const { org_id } = request.body as { org_id: string };

        const result = await db.pool.query(
          `UPDATE pzero.all_users 
           SET org_id = $2
           WHERE id = $1
           RETURNING *`,
          [id, org_id]
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            error: "Not Found",
            message: "User not found",
          });
        }

        return reply.send(result.rows[0]);
      } catch (error) {
        console.error("Associate user with org error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to associate user with organization",
        });
      }
    },
  );

  /**
   * PATCH /api/users/:id/status
   * Change user status
   * 
   * TODO: SECURITY - Add admin role verification
   * Currently any authenticated user can change any user's status.
   * Should be: preHandler: [authenticateToken, requireAdminRole]
   * Waiting for requireAdminRole middleware implementation.
   */
  fastify.patch(
    "/api/users/:id/status",
    {
      preHandler: authenticateToken,
      onSend: onSendHook, // TODO: Add requireAdminRole when available
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const { status } = request.body as { status: string };

        // Validate status field is provided
        if (!status) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Status field is required",
          });
        }

        // Validate status is one of the allowed enum values
        const validStatuses = ['ACTIVE', 'INACTIVE', 'BANNED', 'PENDING', 'BLOCKED'];
        if (!validStatuses.includes(status.toUpperCase())) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}`,
          });
        }

        // Update user status
        const result = await db.pool.query(
          `UPDATE pzero.all_users 
           SET status = $1::pzero.user_status
           WHERE id = $2 AND is_del = false
           RETURNING *`,
          [status.toUpperCase(), id]
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            error: "Not Found",
            message: "User not found",
          });
        }

        const updatedUser = result.rows[0];
        const newStatus = updatedUser.status;

        // Update cache only if it already exists (cache is created on login)
        if (newStatus) {
          await userService.updateUserStatusInCacheIfExists(id, newStatus);
        }

        return reply.send(updatedUser);
      } catch (error) {
        console.error("Change user status error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to change user status",
        });
      }
    },
  );

  /**
   * Internal user routes for WASM filter
   * TODO: Add proper authentication mechanism to verify requests from WASM filter
   * TODO: Consider using shared secret or internal network restriction
   * TODO: Implement request origin verification
   */
  
  // Get user by email - called by WASM filter
  fastify.get<{
    Params: { email: string }
  }>("/internal/user/by-email/:email", {
    config: {
      rateLimit: {
        max: 20, // 20 requests
        timeWindow: '1 minute' // per minute per IP
      }
    }
  }, async (request, reply) => {
    try {
      const { email } = request.params;
      
      // Validate email format
      if (!email || !validateEmail(email)) {
        return reply.status(400).send({ error: "Invalid email format" });
      }
      
      fastify.log.info({ email }, "Fetching user by email for WASM filter");
      
      // Check Redis cache first
      const cacheKey = `user:${email}`;
      const cachedUser = await redis.get(cacheKey);
      
      if (cachedUser) {
        fastify.log.debug({ email }, "User found in Redis cache");
        return reply.send(JSON.parse(cachedUser));
      }
      
      // Query PostgreSQL
      const user = await userService.getUserByEmail(email);
      
      if (!user) {
        fastify.log.warn({ email }, "User not found in database");
        return reply.status(404).send({ error: "User not found" });
      }
      
      // Prepare user object for caching (match WASM filter expectations)
      const userForCache = {
        userId: user.id,  // WASM filter expects userId, not id
        email: user.email,
        is_act: true, // Always true since we query with is_act = true
        status: user.status,
        data: user.data,
      };
      
      // Cache in Redis with TTL (5 minutes)
      await redis.set(cacheKey, JSON.stringify(userForCache), 300);
      fastify.log.info({ email }, "User cached in Redis with 5min TTL");
      
      return reply.send(userForCache);
    } catch (error) {
      fastify.log.error({ err: error, email: request.params.email }, "Error fetching user by email");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
  
  // Invalidate user cache - called when user is updated
  fastify.delete<{
    Params: { email: string }
  }>("/internal/user/cache/:email", async (request, reply) => {
    try {
      const { email } = request.params;
      const cacheKey = `user:${email}`;
      
      await redis.delete(cacheKey);
      fastify.log.info({ email }, "User cache invalidated");
      
      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error({ err: error, email: request.params.email }, "Error invalidating user cache");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}