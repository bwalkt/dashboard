import type { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import { redis } from "../config/redis.js";
import { authService } from "../services/auth.service.js";
import { FilterRedisService } from "../services/filter-redis.service.js";

// Authentication middleware for Redis proxy endpoints
async function authenticateRequest(request: FastifyRequest, reply: FastifyReply) {
  try {
    // For filter requests, check x-filter-token
    const filterToken = request.headers['x-filter-token'] as string;
    if (filterToken) {
      const validation = await FilterRedisService.validateFilterToken(filterToken);
      if (!validation.valid) {
        reply.code(401);
        throw new Error('Invalid filter token');
      }
      // Store filter ID for later use
      (request as any).filterId = validation.filterId;
      return;
    }

    // For admin requests, check standard auth
    const apiKey = request.headers['x-api-key'] as string;
    const authHeader = request.headers['authorization'] as string;
    
    let token = apiKey;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    if (!token) {
      reply.code(401);
      throw new Error('Authentication required - provide x-filter-token, x-api-key, or Bearer token');
    }
    
    // Validate admin token
    const authResult = await authService.validateToken(token);
    if (!authResult.valid || !authResult.user) {
      reply.code(401);
      throw new Error('Invalid authentication token');
    }
    
    (request as any).user = authResult.user;
    
  } catch (error) {
    reply.code(401);
    throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function redisProxyRoutes(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions,
): Promise<void> {
  
  // Apply authentication to all routes in this plugin
  fastify.addHook('preHandler', authenticateRequest);
  
  // Redis proxy endpoint for envoy-wasm-filter
  fastify.post<{
    Body: {
      command: string;
      key: string;
      value?: string;
      field?: string; // For hash operations (HGET, HSET)
      args?: any[];
    }
  }>("/redis-proxy", async (request, reply) => {
    try {
      const { command, key, value, field, args } = request.body;
      
      // Get filter ID from authentication middleware
      const filterId = (request as any).filterId;
      if (!filterId) {
        reply.code(401);
        return { error: "Filter authentication required" };
      }
      
      // Check rate limiting
      const rateLimitOk = await redis.getClient().eval(
        `
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local current = redis.call('INCR', key)
        if current == 1 then
          redis.call('EXPIRE', key, window)
        end
        return current <= limit
        `,
        1,
        `filter:ratelimit:${filterId}`,
        "1000", // 1000 requests
        "60"    // per minute
      );
      
      if (!rateLimitOk) {
        reply.code(429);
        return { error: "Rate limit exceeded" };
      }
      
      // Execute Redis command based on type
      let result: any = null;
      
      switch (command.toUpperCase()) {
        case 'GET':
          result = await redis.get(key);
          break;
          
        case 'SET':
          await redis.set(key, value || "");
          result = "OK";
          break;
          
        case 'SETEX':
          if (args && args[0]) {
            await redis.set(key, value || "", args[0] as number);
            result = "OK";
          }
          break;
          
        case 'HGET':
          // Prioritize robust formats over fragile parsing
          let hgetKey: string;
          let hgetField: string;
          
          if (field) {
            // New format: separate key and field parameters
            hgetKey = key;
            hgetField = field;
          } else if (args && args.length >= 2) {
            // Robust format: use args array [hashKey, field]
            hgetKey = args[0] as string;
            hgetField = args[1] as string;
          } else {
            // Remove fragile colon parsing - require explicit parameters
            return reply.status(400).send({
              error: "HGET requires either 'field' parameter or args array [hashKey, field]. Colon-separated keys are no longer supported for security."
            });
          }
          
          if (!hgetKey || !hgetField) {
            return reply.status(400).send({
              error: "HGET requires non-empty key and field parameters"
            });
          }
          
          result = await redis.getClient().hget(hgetKey, hgetField);
          break;
          
        case 'HSET':
          // Prioritize robust formats over fragile parsing
          let hsetKey: string;
          let hsetField: string;
          
          if (field) {
            // New format: separate key and field parameters
            hsetKey = key;
            hsetField = field;
          } else if (args && args.length >= 2) {
            // Robust format: use args array [hashKey, field]
            hsetKey = args[0] as string;
            hsetField = args[1] as string;
          } else {
            // Remove fragile colon parsing - require explicit parameters
            return reply.status(400).send({
              error: "HSET requires either 'field' parameter or args array [hashKey, field]. Colon-separated keys are no longer supported for security."
            });
          }
          
          if (!hsetKey || !hsetField) {
            return reply.status(400).send({
              error: "HSET requires non-empty key and field parameters"
            });
          }
          
          await redis.getClient().hset(hsetKey, hsetField, value || "");
          result = "OK";
          break;
          
        case 'LPUSH':
          await redis.getClient().lpush(key, value || "");
          result = "OK";
          break;
          
        case 'RPOP':
          result = await redis.getClient().rpop(key);
          break;
          
        case 'EXISTS':
          const exists = await redis.exists(key);
          result = exists ? "1" : "0";
          break;
          
        case 'TTL':
          result = await redis.ttl(key);
          break;
          
        case 'HGETALL':
          result = await redis.getClient().hgetall(key);
          break;
          
        default:
          reply.code(400);
          return { error: `Unsupported command: ${command}` };
      }
      
      return { 
        success: true,
        value: result,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error("Redis proxy error:", error);
      reply.code(500);
      return { error: "Redis operation failed" };
    }
  });
  
  // Get header info directly (optimized for filter)
  fastify.get("/redis-proxy/header-info", async (request, reply) => {
    try {
      // Filter authentication handled by middleware
      
      // Safe JSON parsing helper
      const safeJsonParse = (str: string | null, fallback: any = {}) => {
        if (!str) return fallback;
        try {
          return JSON.parse(str);
        } catch {
          console.warn("Malformed JSON in Redis:", str.substring(0, 100));
          return fallback;
        }
      };
      
      // Get header info from Redis
      const users = await redis.getClient().hget("filter:header:info", "users");
      const endpoints = await redis.getClient().hget("filter:header:info", "endpoints");
      const functions = await redis.getClient().hget("filter:header:info", "functions");
      
      return {
        active_users: safeJsonParse(users),
        active_endpoints: safeJsonParse(endpoints),
        next_functions: safeJsonParse(functions),
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error("Header info retrieval error:", error);
      reply.code(500);
      return { error: "Failed to get header info" };
    }
  });
  
  // Challenge validation result polling
  fastify.get<{
    Params: { requestId: string }
  }>("/redis-proxy/challenge-result/:requestId", async (request, reply) => {
    try {
      // Filter authentication handled by middleware
      
      const { requestId } = request.params;
      const resultKey = `filter:challenge:results:${requestId}`;
      const result = await redis.get(resultKey);
      
      if (!result) {
        reply.code(404);
        return { error: "Result not found or pending" };
      }
      
      // Delete after reading (consume once)
      await redis.delete(resultKey);
      
      // Safe JSON parsing
      try {
        return JSON.parse(result);
      } catch (parseError) {
        console.warn("Malformed JSON in challenge result:", result.substring(0, 100));
        reply.code(500);
        return { error: "Malformed challenge result data" };
      }
      
    } catch (error) {
      console.error("Challenge result retrieval error:", error);
      reply.code(500);
      return { error: "Failed to get challenge result" };
    }
  });
}