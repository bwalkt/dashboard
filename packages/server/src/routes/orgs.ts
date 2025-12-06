import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import { userService } from "../services/user.service.js";

export interface CreateOrgPayload {
  name: string;
  handle: string;
  description?: string;
  status: 'active' | 'inactive' | 'suspended';
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  email: string;
  website?: string;
  phone?: string;
  address?: string;
  owner_id: string;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface CreateOrgWithUserPayload extends CreateOrgPayload {
  create_user?: {
    name: string;
    email: string;
    email_verified?: boolean;
  };
  associate_users?: string[];
}

export interface Organization {
  id: string;
  name: string;
  handle: string;
  description?: string;
  status: string;
  plan: string;
  email: string;
  website?: string;
  phone?: string;
  address?: string;
  owner_id: string;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export async function orgRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/orgs
   * Create a new organization
   */
  fastify.post(
    "/api/orgs",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = request.body as CreateOrgPayload;

        // Validate required fields
        if (!data.name || !data.handle || !data.email || !data.status || !data.plan || !data.owner_id) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Name, handle, email, status, plan, and owner_id are required",
          });
        }

        // Check if handle is unique
        const existingOrg = await db.pool.query(
          "SELECT id FROM pzero.all_orgs WHERE handle = $1 AND deleted_at IS NULL",
          [data.handle]
        );

        if (existingOrg.rows.length > 0) {
          return reply.status(409).send({
            error: "Conflict",
            message: "Organization handle already exists",
          });
        }

        // Use the create_org postgres function
        const createResult = await db.pool.query(
          `SELECT pzero.create_org($1) as result`,
          [
            JSON.stringify({
              name: data.name,
              handle: data.handle,
              website: data.website || "",
              c_by: data.owner_id,
              data: {
                description: data.description || "",
                status: data.status,
                plan: data.plan,
                email: data.email,
                phone: data.phone || "",
                address: data.address || "",
                settings: data.settings || {},
                metadata: data.metadata || {}
              }
            }),
          ],
        );

        const { org_id } = createResult.rows[0].result;

        // Fetch the complete organization record
        const orgResult = await db.pool.query(
          `SELECT * FROM pzero.all_orgs WHERE id = $1`,
          [org_id]
        );

        return reply.send(orgResult.rows[0]);
      } catch (error) {
        console.error("Create organization error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create organization",
        });
      }
    },
  );

  /**
   * POST /api/orgs/create-with-user
   * Create organization with optional user creation and association
   */
  fastify.post(
    "/api/orgs/create-with-user",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = request.body as CreateOrgWithUserPayload;

        // Validate required fields
        if (!data.name || !data.handle || !data.email || !data.status || !data.plan || !data.owner_id) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Name, handle, email, status, plan, and owner_id are required",
          });
        }

        // Check if handle is unique
        const existingOrg = await db.pool.query(
          "SELECT id FROM pzero.all_orgs WHERE handle = $1 AND deleted_at IS NULL",
          [data.handle]
        );

        if (existingOrg.rows.length > 0) {
          return reply.status(409).send({
            error: "Conflict",
            message: "Organization handle already exists",
          });
        }

        let createdUser = null;

        // Create new user if requested
        if (data.create_user && data.create_user.name && data.create_user.email) {
          // Check if user already exists
          const existingUser = await userService.getUserByEmail(data.create_user.email);
          if (existingUser) {
            return reply.status(409).send({
              error: "Conflict",
              message: "User with this email already exists",
            });
          }

          // Create user with email verified by default
          createdUser = await userService.createUserFromEmail({
            name: data.create_user.name,
            email: data.create_user.email,
            email_verified: data.create_user.email_verified ?? true, // Auto-verify for admin-created users
          });
        }

        // Create organization using the postgres function
        const createResult = await db.pool.query(
          `SELECT pzero.create_org($1) as result`,
          [
            JSON.stringify({
              name: data.name,
              handle: data.handle,
              website: data.website || "",
              c_by: data.owner_id,
              data: {
                description: data.description || "",
                status: data.status,
                plan: data.plan,
                email: data.email,
                phone: data.phone || "",
                address: data.address || "",
                settings: data.settings || {},
                metadata: data.metadata || {}
              }
            }),
          ],
        );

        const { org_id } = createResult.rows[0].result;

        // Associate created user with organization
        if (createdUser) {
          await db.pool.query(
            `UPDATE pzero.all_users SET org_id = $1 WHERE id = $2`,
            [org_id, createdUser.id]
          );
        }

        // Associate existing users with organization
        if (data.associate_users && data.associate_users.length > 0) {
          for (const userId of data.associate_users) {
            await db.pool.query(
              `UPDATE pzero.all_users SET org_id = $1 WHERE id = $2`,
              [org_id, userId]
            );
          }
        }

        // Fetch the complete organization record
        const orgResult = await db.pool.query(
          `SELECT * FROM pzero.all_orgs WHERE id = $1`,
          [org_id]
        );

        const response: {
          organization: Organization;
          user?: { id: string; email: string; name: string };
        } = {
          organization: orgResult.rows[0],
        };

        // Include created user details in response
        if (createdUser) {
          response.user = {
            id: createdUser.id,
            email: createdUser.email,
            name: createdUser.name,
          };
        }

        return reply.send(response);
      } catch (error) {
        console.error("Create organization with user error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create organization with user",
        });
      }
    },
  );

  /**
   * GET /api/orgs
   * Get all organizations
   */
  fastify.get(
    "/api/orgs",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await db.pool.query(`
          SELECT * FROM pzero.all_orgs 
          WHERE deleted_at IS NULL
          ORDER BY created_at DESC
        `);

        return reply.send(result.rows);
      } catch (error) {
        console.error("Get organizations error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch organizations",
        });
      }
    },
  );

  /**
   * GET /api/orgs/:id
   * Get organization by ID
   */
  fastify.get(
    "/api/orgs/:id",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const result = await db.pool.query(
          `SELECT * FROM pzero.all_orgs WHERE id = $1 AND deleted_at IS NULL`,
          [id]
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        return reply.send(result.rows[0]);
      } catch (error) {
        console.error("Get organization error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch organization",
        });
      }
    },
  );

  /**
   * PUT /api/orgs/:id
   * Update organization
   */
  fastify.put(
    "/api/orgs/:id",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const data = request.body as Partial<CreateOrgPayload>;

        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (data.name !== undefined) {
          fields.push(`name = $${paramCount++}`);
          values.push(data.name);
        }
        if (data.handle !== undefined) {
          fields.push(`handle = $${paramCount++}`);
          values.push(data.handle);
        }
        if (data.description !== undefined) {
          fields.push(`description = $${paramCount++}`);
          values.push(data.description);
        }
        if (data.status !== undefined) {
          fields.push(`status = $${paramCount++}`);
          values.push(data.status);
        }
        if (data.plan !== undefined) {
          fields.push(`plan = $${paramCount++}`);
          values.push(data.plan);
        }
        if (data.email !== undefined) {
          fields.push(`email = $${paramCount++}`);
          values.push(data.email);
        }
        if (data.website !== undefined) {
          fields.push(`website = $${paramCount++}`);
          values.push(data.website);
        }
        if (data.phone !== undefined) {
          fields.push(`phone = $${paramCount++}`);
          values.push(data.phone);
        }
        if (data.address !== undefined) {
          fields.push(`address = $${paramCount++}`);
          values.push(data.address);
        }
        if (data.settings !== undefined) {
          fields.push(`settings = $${paramCount++}`);
          values.push(JSON.stringify(data.settings));
        }
        if (data.metadata !== undefined) {
          fields.push(`metadata = $${paramCount++}`);
          values.push(JSON.stringify(data.metadata));
        }

        if (fields.length === 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "No fields to update",
          });
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await db.pool.query(
          `UPDATE pzero.all_orgs
           SET ${fields.join(", ")}
           WHERE id = $${paramCount} AND deleted_at IS NULL
           RETURNING *`,
          values,
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        return reply.send(result.rows[0]);
      } catch (error) {
        console.error("Update organization error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to update organization",
        });
      }
    },
  );

  /**
   * DELETE /api/orgs/:id
   * Delete organization (soft delete)
   */
  fastify.delete(
    "/api/orgs/:id",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        // Soft delete by setting deleted_at timestamp
        const result = await db.pool.query(
          `UPDATE pzero.all_orgs 
           SET deleted_at = CURRENT_TIMESTAMP 
           WHERE id = $1 AND deleted_at IS NULL
           RETURNING id`,
          [id]
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        return reply.status(204).send();
      } catch (error) {
        console.error("Delete organization error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete organization",
        });
      }
    },
  );

  /**
   * GET /api/orgs/:id/users
   * Get users in an organization
   */
  fastify.get(
    "/api/orgs/:id/users",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const result = await db.pool.query(`
          SELECT u.*, a.email, a.email_verified
          FROM pzero.all_users u
          JOIN pzero.all_auth a ON u.id = a.id
          WHERE u.org_id = $1 AND u.deleted_at IS NULL
          ORDER BY u.created_at DESC
        `, [id]);

        return reply.send(result.rows);
      } catch (error) {
        console.error("Get organization users error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch organization users",
        });
      }
    },
  );
}