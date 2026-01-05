import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { redis } from "../config/redis.js";

/**
 * Public Redis routes for WASM filter challenge validation
 * These routes bypass all authentication but are rate-limited
 */
export async function redisPublicRoutes(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions,
): Promise<void> {
  
  // Simple GET endpoint for wasm filter (no auth required for challenge validation)
  // Rate limiting is applied at the server level for public routes
  fastify.get<{
    Params: { key: string }
  }>("/redis/get/:key", {
    config: {
      rateLimit: {
        max: 10, // 10 requests
        timeWindow: '1 minute' // per minute per IP
      }
    }
  }, async (request, reply) => {
    try {
      const { key } = request.params;
      
      // Security validations:
      // 1. Only allow access to challenge and user keys
      if (!key.startsWith('challenge:') && !key.startsWith('user:')) {
        fastify.log.warn({ key }, 'Blocked access to non-allowed key');
        return reply.status(403).send("");
      }
      
      // 2. Validate key format (prevent injection attacks)
      // Allowed keys: challenge:<id> or user:<email>
      const allowedKeyPattern = /^(challenge:[a-zA-Z0-9_-]+|user:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
      if (!allowedKeyPattern.test(key)) {
        fastify.log.warn({ key }, 'Invalid key format');
        return reply.status(400).send("");
      }
      
      // 3. Limit key length to prevent DoS
      if (key.length > 100) {
        fastify.log.warn({ key, length: key.length }, 'Key too long');
        return reply.status(400).send("");
      }
      
      fastify.log.debug({ key }, 'Fetching Redis key');
      const value = await redis.get(key);
      // Don't log values - may contain sensitive data
      
      // Return raw value for the filter - send as plain text
      reply.type('text/plain');
      
      if (value === null) {
        return reply.status(404).send("");
      }
      return reply.send(value);
    } catch (error) {
      fastify.log.error({ err: error, key: request.params.key }, 'Redis GET error');
      return reply.status(500).send("");
    }
  });
}