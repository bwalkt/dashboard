import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { redis } from "../config/redis.js";

/**
 * Public Redis routes for WASM filter challenge validation
 * These routes bypass all authentication
 */
export async function redisPublicRoutes(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions,
): Promise<void> {
  
  // Simple GET endpoint for wasm filter (no auth required for challenge validation)
  fastify.get<{
    Params: { key: string }
  }>("/redis/get/:key", async (request, reply) => {
    try {
      const { key } = request.params;
      console.log(`[Redis GET] Fetching key: ${key}`);
      const value = await redis.get(key);
      console.log(`[Redis GET] Value for ${key}: ${value}`);
      
      // Return raw value for the filter - send as plain text
      reply.type('text/plain');
      
      if (value === null) {
        return reply.status(404).send("");
      }
      return reply.send(value);
    } catch (error) {
      console.error("Redis GET error:", error);
      return reply.status(500).send("");
    }
  });
}