import type { 
  CreateOrganizationWithUserData,
  CreateOrgData, 
  Org, 
  OrgPlan, 
  OrgStatus,
  UpdateOrgData
} from "@pzero/shared/pzero";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import { userService } from "../services/user.service.js";

// Using shared types from @pzero/shared/pzero/orgs
// CreateOrgData, Org, CreateOrganizationWithUserData, UpdateOrgData are imported above

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
        const data = request.body as CreateOrgData & {
          status: OrgStatus;
          plan: OrgPlan;
        };

        // Validate required fields
        if (!data.name || !data.handle || !data.email || !data.status || !data.plan) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Name, handle, email, status, and plan are required",
          });
        }

        // Get authenticated user ID
        const authenticatedUserId = (request as any).user?.id;
        if (!authenticatedUserId) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "Authentication required",
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
              c_by: authenticatedUserId,
              data: {
                dscr: data.dscr || "",
                status: data.status,
                plan: data.plan,
                email: data.email,
                phone: data.phone || "",
                address: data.address || "",
                ...data.data,
                meta: {
                  uid: authenticatedUserId
                }
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
      // Get a database client for transaction support
      const client = await db.pool.connect();
      
      try {
        // Start transaction
        await client.query('BEGIN');
        
        const data = request.body as CreateOrganizationWithUserData;
        
        console.log('🔥 SERVER: Received request at /orgs/create-with-user')
        console.log('🔥 SERVER: Request headers:', JSON.stringify(request.headers, null, 2))
        console.log('🔥 SERVER: Request body:', JSON.stringify(data, null, 2))
        console.log('🔥 SERVER: Request user context:', request.user ? JSON.stringify(request.user, null, 2) : 'No user context')

        // Get authenticated user ID
        const authenticatedUserId = (request as any).user?.id;
        if (!authenticatedUserId) {
          console.log('🔥 SERVER: Authentication failed - no user context')
          await client.query('ROLLBACK');
          return reply.status(401).send({
            error: "Unauthorized",
            message: "Authentication required",
          });
        }

        // Validate required fields
        if (!data.name || !data.handle || !data.email || !data.status || !data.plan) {
          console.log('🔥 SERVER: Validation failed - missing required fields:', {
            name: !data.name ? 'MISSING' : 'OK',
            handle: !data.handle ? 'MISSING' : 'OK',
            email: !data.email ? 'MISSING' : 'OK',
            status: !data.status ? 'MISSING' : 'OK',
            plan: !data.plan ? 'MISSING' : 'OK'
          })
          await client.query('ROLLBACK');
          return reply.status(400).send({
            error: "Bad Request",
            message: "Name, handle, email, status, and plan are required",
          });
        }

        // Check if handle is unique
        console.log('🔥 SERVER: Checking if handle is unique:', data.handle)
        const existingOrg = await client.query(
          "SELECT id FROM pzero.all_orgs WHERE handle = $1 AND deleted_at IS NULL",
          [data.handle]
        );
        console.log('🔥 SERVER: Handle check result:', { found: existingOrg.rows.length > 0, rowCount: existingOrg.rows.length })

        if (existingOrg.rows.length > 0) {
          console.log('🔥 SERVER: Handle conflict detected, returning 409')
          await client.query('ROLLBACK');
          return reply.status(409).send({
            error: "Conflict",
            message: "Organization handle already exists",
          });
        }

        let createdUser = null;

        // Create new user if requested
        if (data.create_user && data.create_user.name && data.create_user.email) {
          // Check if user already exists
          const existingUserCheck = await client.query(
            "SELECT id FROM pzero.all_users WHERE email = $1 AND deleted_at IS NULL",
            [data.create_user.email]
          );
          
          if (existingUserCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return reply.status(409).send({
              error: "Conflict",
              message: "User with this email already exists",
            });
          }

          // Create user within the transaction
          const userCreateResult = await client.query(
            `INSERT INTO pzero.all_users (name, email, email_verified, c_at, u_at) 
             VALUES ($1, $2, $3, NOW(), NOW()) 
             RETURNING id, name, email, email_verified`,
            [data.create_user.name, data.create_user.email, data.create_user.email_verified ?? true]
          );
          
          createdUser = userCreateResult.rows[0];
        }

        // Create organization using the postgres function
        const orgCreateData = {
          name: data.name,
          handle: data.handle,
          website: data.website || "",
          c_by: authenticatedUserId,
          data: {
            dscr: data.dscr || "",
            status: data.status,
            plan: data.plan,
            email: data.email,
            phone: data.phone || "",
            address: data.address || "",
            ...data.data,
            meta: {
              uid: authenticatedUserId
            }
          }
        }
        console.log('🔥 SERVER: Creating organization with data:', JSON.stringify(orgCreateData, null, 2))
        
        const createResult = await client.query(
          `SELECT pzero.create_org($1) as result`,
          [JSON.stringify(orgCreateData)],
        );
        console.log('🔥 SERVER: Organization creation result:', JSON.stringify(createResult.rows, null, 2))

        const { org_id } = createResult.rows[0].result;
        console.log('🔥 SERVER: Created organization with ID:', org_id)

        // Associate created user with organization
        if (createdUser) {
          await client.query(
            `UPDATE pzero.all_users SET org_id = $1 WHERE id = $2`,
            [org_id, createdUser.id]
          );
        }

        // Associate existing users with organization
        if (data.associate_users && data.associate_users.length > 0) {
          for (const userId of data.associate_users) {
            await client.query(
              `UPDATE pzero.all_users SET org_id = $1 WHERE id = $2`,
              [org_id, userId]
            );
          }
        }

        // Fetch the complete organization record
        const orgResult = await client.query(
          `SELECT * FROM pzero.all_orgs WHERE id = $1`,
          [org_id]
        );

        const response: {
          organization: Org;
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

        // Commit the transaction
        await client.query('COMMIT');
        
        console.log('🔥 SERVER: Sending successful response:', JSON.stringify(response, null, 2))
        return reply.send(response);
      } catch (error) {
        // Rollback the transaction on error
        await client.query('ROLLBACK');
        
        console.error("❌ SERVER: Create organization with user error:", error);
        console.error("❌ SERVER: Error details:", {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          type: typeof error
        })
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create organization with user",
        });
      } finally {
        // Always release the client back to the pool
        client.release();
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
        const data = request.body as UpdateOrgData;

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
        if (data.dscr !== undefined) {
          fields.push(`dscr = $${paramCount++}`);
          values.push(data.dscr);
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
        if (data.data !== undefined) {
          fields.push(`data = $${paramCount++}`);
          values.push(JSON.stringify(data.data));
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