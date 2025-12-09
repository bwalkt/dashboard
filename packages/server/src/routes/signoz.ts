import type { SigNozQueryOptions } from "@pzero/shared/types";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authenticateToken } from "../middleware/auth.js";
import { queryTraces } from "../services/signoz.service.js";

interface SigNozTracesRequest {
  Body: SigNozQueryOptions;
}

export async function signozRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /signoz/traces - Query SigNoz for traces
  fastify.post<SigNozTracesRequest>(
    "/signoz/traces",
    {
      preHandler: [authenticateToken],
    },
    async (
      request: FastifyRequest<SigNozTracesRequest>,
      reply: FastifyReply,
    ) => {
      try {
        const { filters, pagination } = request.body;

        // Validate required fields
        if (!filters || !pagination) {
          return reply.code(400).send({
            error: "Missing required fields",
            message: "filters and pagination are required",
          });
        }

        // Validate filters
        if (
          typeof filters.startTime !== "number" ||
          typeof filters.endTime !== "number"
        ) {
          return reply.code(400).send({
            error: "Invalid filters",
            message: "startTime and endTime must be numbers (epoch timestamps in milliseconds)",
          });
        }

        // Validate time range
        if (filters.startTime >= filters.endTime) {
          return reply.code(400).send({
            error: "Invalid time range",
            message: "startTime must be less than endTime",
          });
        }

        // Validate pagination
        if (
          typeof pagination.limit !== "number" ||
          typeof pagination.offset !== "number" ||
          pagination.limit < 1 ||
          pagination.offset < 0
        ) {
          return reply.code(400).send({
            error: "Invalid pagination",
            message: "limit must be >= 1 and offset must be >= 0",
          });
        }

        const result = await queryTraces({ filters, pagination });
        return reply.code(200).send(result);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const statusCode = errorMessage.includes("not configured") ? 503 : 500;

        return reply.code(statusCode).send({
          error: "Failed to query SigNoz traces",
          message: errorMessage,
        });
      }
    },
  );
}

