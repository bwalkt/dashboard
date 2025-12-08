import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import { refreshProxyTargetsCache } from "../services/proxy-targets-cache.service.js";

interface CreateProxyTargetRequest {
  name: string;
  url: string;
  port?: number;
}

interface UpdateProxyTargetRequest {
  name?: string;
  url?: string;
  port?: number;
}

export async function proxyTargetsRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /proxy-targets - Create a new proxy target
  fastify.post<{
    Body: CreateProxyTargetRequest;
  }>(
    "/proxy-targets",
    {
      preHandler: [authenticateToken],
    },
    async (
      request: FastifyRequest<{ Body: CreateProxyTargetRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const { name, url, port } = request.body;

        // Validate required fields
        if (!name || !url) {
          return reply.code(400).send({
            error: "Missing required fields",
            message: "name and url are required",
          });
        }

        // Validate name is not empty
        if (typeof name !== "string" || name.trim().length === 0) {
          return reply.code(400).send({
            error: "Invalid name",
            message: "name must be a non-empty string",
          });
        }

        // Validate url is not empty
        if (typeof url !== "string" || url.trim().length === 0) {
          return reply.code(400).send({
            error: "Invalid url",
            message: "url must be a non-empty string",
          });
        }

        // Validate port range if provided, otherwise use default 80
        let portNum: number | null = null;
        if (port !== undefined) {
          portNum = Number(port);
          if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
            return reply.code(400).send({
              error: "Invalid port",
              message: "Port must be an integer between 1 and 65535",
            });
          }
        }

        // Insert new proxy target (port will default to 80 if not provided)
        const insertQuery = `
          INSERT INTO pzero.proxy_targets (name, url, port)
          VALUES ($1, $2, COALESCE($3, 80))
          RETURNING *
        `;

        const result = await db.query(insertQuery, [name.trim(), url.trim(), portNum]);

        if (result.rows.length === 0) {
          return reply.code(500).send({
            error: "Internal server error",
            message: "Failed to create proxy target",
          });
        }

        const proxyTarget = result.rows[0];

        // Refresh cache after creating new proxy target
        try {
          await refreshProxyTargetsCache();
        } catch (cacheError) {
          console.warn("Failed to refresh cache after creating proxy target:", cacheError);
          // Continue even if cache refresh fails
        }

        return reply.code(201).send({
          success: true,
          proxyTarget: {
            id: proxyTarget.id,
            name: proxyTarget.name,
            url: proxyTarget.url,
            port: proxyTarget.port,
            createdAt: proxyTarget.created_at,
            updatedAt: proxyTarget.updated_at,
          },
        });
      } catch (error) {
        console.error("Error creating proxy target:", error);

        // Handle unique constraint violation (PostgreSQL error code 23505)
        if ((error as any)?.code === "23505") {
          return reply.code(409).send({
            error: "Conflict",
            message: "A proxy target with this URL already exists",
          });
        }

        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to create proxy target",
          details:
            process.env.NODE_ENV === "development"
              ? error instanceof Error
                ? error.message
                : String(error)
              : undefined,
        });
      }
    }
  );

  // GET /proxy-targets - Get all proxy targets
  fastify.get(
    "/proxy-targets",
    {
      preHandler: [authenticateToken],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = `
          SELECT id, name, url, port, created_at, updated_at
          FROM pzero.proxy_targets
          ORDER BY created_at DESC
        `;

        const result = await db.query(query);

        return reply.code(200).send({
          success: true,
          proxyTargets: result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            url: row.url,
            port: row.port,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          })),
        });
      } catch (error) {
        console.error("Error fetching proxy targets:", error);

        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to fetch proxy targets",
        });
      }
    }
  );

  // GET /proxy-targets/:id - Get a single proxy target by ID
  fastify.get<{
    Params: { id: string };
  }>(
    "/proxy-targets/:id",
    {
      preHandler: [authenticateToken],
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;

        const query = `
          SELECT id, name, url, port, created_at, updated_at
          FROM pzero.proxy_targets
          WHERE id = $1
        `;

        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
          return reply.code(404).send({
            error: "Not found",
            message: "Proxy target not found",
          });
        }

        const proxyTarget = result.rows[0];

        return reply.code(200).send({
          success: true,
          proxyTarget: {
            id: proxyTarget.id,
            name: proxyTarget.name,
            url: proxyTarget.url,
            port: proxyTarget.port,
            createdAt: proxyTarget.created_at,
            updatedAt: proxyTarget.updated_at,
          },
        });
      } catch (error) {
        console.error("Error fetching proxy target:", error);

        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to fetch proxy target",
        });
      }
    }
  );

  // PUT /proxy-targets/:id - Update a proxy target
  fastify.put<{
    Params: { id: string };
    Body: UpdateProxyTargetRequest;
  }>(
    "/proxy-targets/:id",
    {
      preHandler: [authenticateToken],
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateProxyTargetRequest;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const { name, url, port } = request.body;

        // Check if proxy target exists
        const checkQuery = `
          SELECT id FROM pzero.proxy_targets WHERE id = $1
        `;
        const checkResult = await db.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
          return reply.code(404).send({
            error: "Not found",
            message: "Proxy target not found",
          });
        }

        // Build update query dynamically based on provided fields
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (name !== undefined) {
          if (typeof name !== "string" || name.trim().length === 0) {
            return reply.code(400).send({
              error: "Invalid name",
              message: "name must be a non-empty string",
            });
          }
          updates.push(`name = $${paramIndex++}`);
          values.push(name.trim());
        }

        if (url !== undefined) {
          if (typeof url !== "string" || url.trim().length === 0) {
            return reply.code(400).send({
              error: "Invalid url",
              message: "url must be a non-empty string",
            });
          }
          updates.push(`url = $${paramIndex++}`);
          values.push(url.trim());
        }

        if (port !== undefined) {
          if (port === null) {
            // Explicitly set to null to use database default (80)
            updates.push(`port = $${paramIndex++}`);
            values.push(null);
          } else {
            const portNum = Number(port);
            if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
              return reply.code(400).send({
                error: "Invalid port",
                message: "Port must be an integer between 1 and 65535",
              });
            }
            updates.push(`port = $${paramIndex++}`);
            values.push(portNum);
          }
        }

        if (updates.length === 0) {
          return reply.code(400).send({
            error: "Bad request",
            message: "At least one field (name, url, or port) must be provided for update",
          });
        }

        // Add id to values for WHERE clause
        values.push(id);

        const updateQuery = `
          UPDATE pzero.proxy_targets
          SET ${updates.join(", ")}
          WHERE id = $${paramIndex}
          RETURNING *
        `;

        const result = await db.query(updateQuery, values);

        if (result.rows.length === 0) {
          return reply.code(500).send({
            error: "Internal server error",
            message: "Failed to update proxy target",
          });
        }

        const proxyTarget = result.rows[0];

        // Refresh cache after updating proxy target
        try {
          await refreshProxyTargetsCache();
        } catch (cacheError) {
          console.warn("Failed to refresh cache after updating proxy target:", cacheError);
          // Continue even if cache refresh fails
        }

        return reply.code(200).send({
          success: true,
          proxyTarget: {
            id: proxyTarget.id,
            name: proxyTarget.name,
            url: proxyTarget.url,
            port: proxyTarget.port,
            createdAt: proxyTarget.created_at,
            updatedAt: proxyTarget.updated_at,
          },
        });
      } catch (error) {
        console.error("Error updating proxy target:", error);

        // Handle unique constraint violation (PostgreSQL error code 23505)
        if ((error as any)?.code === "23505") {
          return reply.code(409).send({
            error: "Conflict",
            message: "A proxy target with this URL already exists",
          });
        }

        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to update proxy target",
          details:
            process.env.NODE_ENV === "development"
              ? error instanceof Error
                ? error.message
                : String(error)
              : undefined,
        });
      }
    }
  );

  // DELETE /proxy-targets/:id - Delete a proxy target
  fastify.delete<{
    Params: { id: string };
  }>(
    "/proxy-targets/:id",
    {
      preHandler: [authenticateToken],
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;

        // Check if proxy target exists
        const checkQuery = `
          SELECT id FROM pzero.proxy_targets WHERE id = $1
        `;
        const checkResult = await db.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
          return reply.code(404).send({
            error: "Not found",
            message: "Proxy target not found",
          });
        }

        // Delete the proxy target
        const deleteQuery = `
          DELETE FROM pzero.proxy_targets
          WHERE id = $1
        `;

        await db.query(deleteQuery, [id]);

        // Refresh cache after deleting proxy target
        try {
          await refreshProxyTargetsCache();
        } catch (cacheError) {
          console.warn("Failed to refresh cache after deleting proxy target:", cacheError);
          // Continue even if cache refresh fails
        }

        return reply.code(200).send({
          success: true,
          message: "Proxy target deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting proxy target:", error);

        return reply.code(500).send({
          error: "Internal server error",
          message: "Failed to delete proxy target",
        });
      }
    }
  );
}

