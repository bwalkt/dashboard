import { 
  type CreateOrganizationWithUserData,
  type CreateOrgData, 
  generateHandleFromEmail,
  generateHandleFromName, 
  type Org, 
  type OrgPlan, 
  type OrgStatus,
  type UpdateOrgData
} from "@pzero/shared/pzero";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import { userService } from "../services/user.service.js";

// Using shared types from @pzero/shared/pzero/orgs
// CreateOrgData, Org, CreateOrganizationWithUserData, UpdateOrgData are imported above

// Helper function to decode coordinates stored as fixed-point integers
function decodeCoordinates(org: any): any {
  if (org.lat !== null) org.lat = org.lat / 10000;
  if (org.lon !== null) org.lon = org.lon / 10000;
  if (org.alt !== null) org.alt = org.alt / 10000;
  return org;
}

// Geocoding function using Geoapify
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || process.env.REACT_APP_GEOAPIFY_API_KEY;
    
    if (!GEOAPIFY_API_KEY) {
      console.error('GEOAPIFY_API_KEY environment variable is required for geocoding');
      throw new Error('Geoapify API key not configured');
    }
    
    const params = new URLSearchParams({
      text: address.trim(),
      limit: '1'
    });
    
    const response = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${GEOAPIFY_API_KEY}`
      }
    });
    
    if (!response.ok) {
      console.warn('Geoapify geocoding service unavailable:', response.status);
      return null;
    }
    
    const data = await response.json();
    if (data?.features && data.features.length > 0) {
      const feature = data.features[0];
      const [lon, lat] = feature.geometry.coordinates;
      
      return {
        lat: parseFloat(lat),
        lon: parseFloat(lon)
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Geoapify geocoding failed:', error);
    return null;
  }
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
          "SELECT id FROM pzero.orgs WHERE handle = $1",
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
              handle: data.handle || generateHandleFromName(data.name),
              website: data.website || "",
              c_by: authenticatedUserId,
              dscr: data.dscr || "",
              status: data.status || "ACTIVE",
              plan: data.plan || "STARTER",
              email: data.email,
              phone: data.phone || "",
              address: data.address || "",
              data: {
                ...data.data,
                meta: {
                  c_by: authenticatedUserId
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

        return reply.send(decodeCoordinates(orgResult.rows[0]));
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
      let client;
      
      try {
        // Start transaction
        
        const data = request.body as CreateOrganizationWithUserData;
        
        console.log('🔥 SERVER: Received request at /orgs/create-with-user')
        console.log('🔥 SERVER: Request headers:', JSON.stringify(request.headers, null, 2))
        console.log('🔥 SERVER: Request body:', JSON.stringify(data, null, 2))
        console.log('🔥 SERVER: Request user context:', request.user ? JSON.stringify(request.user, null, 2) : 'No user context')

        // Get authenticated user ID
        const authenticatedUserId = (request as any).user?.id;
        if (!authenticatedUserId) {
          console.log('🔥 SERVER: Authentication failed - no user context')
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
          return reply.status(400).send({
            error: "Bad Request",
            message: "Name, handle, email, status, and plan are required",
          });
        }

        // Geocode address if provided
        let coordinates = null;
        if (data.address && data.address.trim()) {
          console.log('🔥 SERVER: Geocoding address:', data.address);
          coordinates = await geocodeAddress(data.address);
          if (coordinates) {
            console.log('🔥 SERVER: Geocoded coordinates:', coordinates);
          } else {
            console.log('🔥 SERVER: Geocoding failed for address:', data.address);
          }
        }

        // Prepare the complete payload for the PostgreSQL function
        const requestPayload = {
          name: data.name,
            handle: data.handle || generateHandleFromName(data.name),
          dscr: data.dscr || "",
          status: data.status || "ACTIVE",
          plan: data.plan || "STARTER",
          c_by: authenticatedUserId,
          email: data.email || "",
          website: data.website || "",
          phone: data.phone || "",
          part_by: data.part_by || "pzero",
          // Skip address field for now to test
          // ...(data.address && { address: data.address }),
          // Add coordinates if geocoding was successful
          ...(coordinates && {
            lat: coordinates.lat,
            lon: coordinates.lon,
            alt: 0  // Default altitude
          }),
          data: {
            ...data.data,
            meta: {
              c_by: authenticatedUserId
            }
          },
          create_user: data.create_user ? {
            name: data.create_user.name,
            email: data.create_user.email,
            email_verified: data.create_user.email_verified ?? true,    
            handle: data.create_user.handle || generateHandleFromEmail(data.create_user.email),
            relation: data.create_user.relation || 32766,
          } : undefined
        };
        client = await db.pool.connect()
        console.log('🔥 SERVER: Sending payload to pzero.create_org_with_auth:', JSON.stringify(requestPayload, null, 2))
        
        // Send the request payload to the PostgreSQL function
        const createOrgResult = await client.query(
          `SELECT pzero.create_org_with_auth($1::jsonb) as result`,
          [JSON.stringify(requestPayload)],
        );
        
        if (!createOrgResult.rows[0].result) {
          await client.query('ROLLBACK');
          return reply.status(500).send({
            error: "Internal Server Error",
            message: "Failed to create organization",
          });
        }
        
        const resultData = typeof createOrgResult.rows[0].result === 'string' 
          ? JSON.parse(createOrgResult.rows[0].result) 
          : createOrgResult.rows[0].result;
        const org_id = resultData.org_id;
        const createdUser = resultData.user || null;
        
        console.log('🔥 SERVER: Created organization with ID:', org_id)
        if (createdUser) {
          console.log('🔥 SERVER: Created user:', createdUser)
        }

        // Fetch the complete organization record
        const orgResult = await client.query(
          `SELECT * FROM pzero.all_orgs WHERE id = $1`,
          [org_id]
        );

        const response: {
          org: Org;
          user?: { id: string; email: string; name: string };
        } = {
          org: decodeCoordinates(orgResult.rows[0]),
        };

        // Include created user details in response
        if (createdUser) {
          response.user = {
            id: createdUser.user_id || createdUser.id || createdUser.auth_id,
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
        if (client) await client.query('ROLLBACK');
        
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
        if (client) client.release();
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
          SELECT * FROM pzero.orgs 
          ORDER BY c_at DESC
        `);

        return reply.send(result.rows.map(decodeCoordinates));
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
          `SELECT * FROM pzero.orgs WHERE id = $1`,
          [id]
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        return reply.send(decodeCoordinates(result.rows[0]));
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
          `UPDATE pzero.orgs
           SET ${fields.join(", ")}
           WHERE id = $${paramCount}
           RETURNING *`,
          values,
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Organization not found",
          });
        }

        return reply.send(decodeCoordinates(result.rows[0]));
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

        // Soft delete by setting is_del to true and is_act to false
        const result = await db.pool.query(
          `UPDATE pzero.all_orgs 
           SET is_del = true, is_act = false
           WHERE id = $1 AND is_del = false
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
          FROM pzero.users u
          JOIN pzero.auth a ON u.id = a.id
          WHERE u.org_id = $1
          ORDER BY u.c_at DESC
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