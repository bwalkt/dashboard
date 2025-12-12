import { type User } from "@pzero/shared/pzero";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import { userService } from "../services/user.service.js";
export interface CreateUserPayload {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  org_id?: string;
  metadata?: Record<string, any>;
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
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await db.pool.query(`
          SELECT u.*, a.email, a.email_verified
          FROM pzero.all_users u
          JOIN pzero.all_auth a ON u.id = a.id
          WHERE u.is_del = false
          ORDER BY u.created_at DESC
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
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        // Soft delete by setting deleted_at timestamp
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
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const { token } = request.body as { token: string };

        // For now, just mark as verified (in production, validate the token)
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
   */
  fastify.post(
    "/api/users/:id/mark-verified",
    {
      preHandler: authenticateToken,
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
}