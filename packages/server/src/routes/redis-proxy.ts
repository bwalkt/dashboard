import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { redis } from "../config/redis.js";
import { FilterRedisService } from "../services/filter-redis.service.js";

export async function redisProxyRoutes(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions,
): Promise<void> {
  
  // Redis proxy endpoint for envoy-wasm-filter
  fastify.post<{
    Body: {
      command: string;
      key: string;
      value?: string;
      token: string;
      args?: any[];
    }
  }>("/redis-proxy", async (request, reply) => {
    try {
      const { command, key, value, token, args } = request.body;
      
      // Validate filter token
      const validation = await FilterRedisService.validateFilterToken(token);
      if (!validation.valid) {
        reply.code(401);
        return { error: "Invalid filter token" };
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
        `filter:ratelimit:${validation.filterId}`,
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
          const [hkey, hfield] = key.split(':');
          result = await redis.getClient().hget(hkey, hfield);
          break;
          
        case 'HSET':
          const [hskey, hsfield] = key.split(':');
          await redis.getClient().hset(hskey, hsfield, value || "");
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
      // Validate filter token from header
      const token = request.headers['x-filter-token'] as string;
      if (!token) {
        reply.code(401);
        return { error: "Missing filter token" };
      }
      
      const validation = await FilterRedisService.validateFilterToken(token);
      if (!validation.valid) {
        reply.code(401);
        return { error: "Invalid filter token" };
      }
      
      // Get header info from Redis
      const users = await redis.getClient().hget("filter:header:info", "users");
      const endpoints = await redis.getClient().hget("filter:header:info", "endpoints");
      const functions = await redis.getClient().hget("filter:header:info", "functions");
      
      return {
        active_users: users ? JSON.parse(users) : {},
        active_endpoints: endpoints ? JSON.parse(endpoints) : {},
        next_functions: functions ? JSON.parse(functions) : {},
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
      const token = request.headers['x-filter-token'] as string;
      if (!token) {
        reply.code(401);
        return { error: "Missing filter token" };
      }
      
      const validation = await FilterRedisService.validateFilterToken(token);
      if (!validation.valid) {
        reply.code(401);
        return { error: "Invalid filter token" };
      }
      
      const { requestId } = request.params;
      const resultKey = `filter:challenge:results:${requestId}`;
      const result = await redis.get(resultKey);
      
      if (!result) {
        reply.code(404);
        return { error: "Result not found or pending" };
      }
      
      // Delete after reading (consume once)
      await redis.delete(resultKey);
      
      return JSON.parse(result);
      
    } catch (error) {
      console.error("Challenge result retrieval error:", error);
      reply.code(500);
      return { error: "Failed to get challenge result" };
    }
  });
}