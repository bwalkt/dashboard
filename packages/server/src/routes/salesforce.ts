import type { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import { salesforceConfig } from "../config/salesforce.js";
import { authenticateToken } from "../middleware/auth.js";
import { SalesforceClient } from "../services/salesforce-client.service.js";
import type { SalesforceRecordRequest } from "../types/salesforce.js";
import { OrderSchema, ProductSchema } from "@dashboard/shared-types";

/**
 * Salesforce API Routes
 * Provides REST endpoints for Salesforce integration
 */
export async function salesforceRoutes(fastify: FastifyInstance, options: FastifyPluginOptions): Promise<void> {
  // Initialize Salesforce client
  let salesforceClient: SalesforceClient | undefined;

  try {
    const config = salesforceConfig.getConfig();
    salesforceClient = new SalesforceClient(config);
    fastify.log.info("Salesforce client initialized successfully");
  } catch (error) {
    fastify.log.warn("Salesforce configuration error - server will start without Salesforce integration");
    fastify.log.warn("To enable Salesforce integration, set the following environment variables:");
    fastify.log.warn("- SALESFORCE_CONSUMER_KEY");
    fastify.log.warn("- SALESFORCE_USERNAME");
    fastify.log.warn("- SALESFORCE_LOGIN_URL (optional)");
    fastify.log.warn(`Error: ${(error as Error).message}`);
  }

  // Authenticate with Salesforce
  fastify.post(
    "/salesforce/auth",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!salesforceClient) {
          reply.code(500).send({
            error: "Salesforce client not initialized",
          });
          return;
        }

        const authResult = await salesforceClient.authenticate();

        reply.send({
          success: true,
          message: "Successfully authenticated with Salesforce",
          instanceUrl: authResult.instanceUrl,
          tokenType: authResult.tokenType,
          scope: authResult.scope,
        });
      } catch (error) {
        fastify.log.error(error, "Salesforce authentication error");
        reply.code(401).send({
          error: "Authentication failed",
          message: (error as Error).message,
        });
      }
    }
  );

  // Query Salesforce records
  fastify.get(
    "/salesforce/:objectType/query",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!salesforceClient) {
          reply.code(500).send({
            error: "Salesforce client not initialized",
          });
          return;
        }

        const { objectType } = request.params as { objectType: string };

        const keys: string[] = [];

        if (objectType === "Order") {
          keys.push(...Object.keys(OrderSchema.shape).filter((key) => key !== "attributes"));
        } else if (objectType === "Product2") {
          keys.push(...Object.keys(ProductSchema.shape).filter((key) => key !== "attributes"));
        }

        const fields = keys.join(",");
        const soql = `SELECT ${fields} FROM ${objectType} LIMIT 20000`;

        const results = await salesforceClient.query(soql);

        reply.send({
          success: true,
          query: soql,
          totalSize: results.totalSize,
          records: results.records,
          done: results.done,
        });
      } catch (error) {
        fastify.log.error(error, "Salesforce query error");
        reply.code(400).send({
          error: "Query failed",
          message: (error as Error).message,
        });
      }
    }
  );

  // Create a record
  fastify.post(
    "/salesforce/records/:objectType",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!salesforceClient) {
          reply.code(500).send({
            error: "Salesforce client not initialized",
          });
          return;
        }

        const { objectType } = request.params as { objectType: string };
        const recordData = request.body as SalesforceRecordRequest;

        if (!recordData || Object.keys(recordData).length === 0) {
          reply.code(400).send({
            error: "Record data is required",
          });
          return;
        }

        const result = await salesforceClient.createRecord(objectType, recordData);

        reply.send({
          success: true,
          message: `${objectType} record created successfully`,
          id: result.id,
        });
      } catch (error) {
        fastify.log.error(error, "Salesforce create record error");
        reply.code(400).send({
          error: "Record creation failed",
          message: (error as Error).message,
        });
      }
    }
  );

  // Get a record by ID
  fastify.get(
    "/salesforce/records/:objectType/:recordId",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!salesforceClient) {
          reply.code(500).send({
            error: "Salesforce client not initialized",
          });
          return;
        }

        const { objectType, recordId } = request.params as { objectType: string; recordId: string };
        const { fields } = request.query as { fields?: string };

        const fieldArray = fields ? fields.split(",") : null;
        const record = await salesforceClient.getRecord(objectType, recordId, fieldArray);

        reply.send({
          success: true,
          record: record,
        });
      } catch (error) {
        fastify.log.error(error, "Salesforce get record error");
        reply.code(404).send({
          error: "Record not found",
          message: (error as Error).message,
        });
      }
    }
  );

  // Update a record
  fastify.put(
    "/salesforce/records/:objectType/:recordId",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!salesforceClient) {
          reply.code(500).send({
            error: "Salesforce client not initialized",
          });
          return;
        }

        const { objectType, recordId } = request.params as { objectType: string; recordId: string };
        const updateData = request.body as SalesforceRecordRequest;

        if (!updateData || Object.keys(updateData).length === 0) {
          reply.code(400).send({
            error: "Update data is required",
          });
          return;
        }

        await salesforceClient.updateRecord(objectType, recordId, updateData);

        reply.send({
          success: true,
          message: `${objectType} record updated successfully`,
          id: recordId,
        });
      } catch (error) {
        fastify.log.error(error, "Salesforce update record error");
        reply.code(400).send({
          error: "Record update failed",
          message: (error as Error).message,
        });
      }
    }
  );

  // Get object metadata
  fastify.get(
    "/salesforce/metadata/:objectType",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!salesforceClient) {
          reply.code(500).send({
            error: "Salesforce client not initialized",
          });
          return;
        }

        const { objectType } = request.params as { objectType: string };
        const metadata = await salesforceClient.getObjectMetadata(objectType);

        reply.send({
          success: true,
          objectType: objectType,
          metadata: metadata,
        });
      } catch (error) {
        fastify.log.error(error, "Salesforce metadata error");
        reply.code(404).send({
          error: "Object metadata not found",
          message: (error as Error).message,
        });
      }
    }
  );
}
