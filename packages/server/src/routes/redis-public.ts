import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { redis } from "../config/redis.js";

/**
 * Registers a public GET endpoint at /redis/get/:key that returns the raw Redis value as plain text for WASM filter challenge validation and bypasses authentication.
 *
 * The route fetches the requested key from Redis and:
 * - responds with the key's value as plain text if found,
 * - responds with HTTP 404 and an empty body if the key is not present,
 * - responds with HTTP 500 and an empty body on errors.
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