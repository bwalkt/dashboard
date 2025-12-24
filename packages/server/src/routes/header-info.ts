import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { filterRedisService } from "../services/filter-redis.service.js";
import { HeaderInfoCacheService, headerInfoCache } from "../services/header-info-cache.service.js";

export async function headerInfoRoutes(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions,
): Promise<void> {

  // User management endpoints
  fastify.post<{ Params: { uid: string } }>("/header-info/users/:uid/activate", async (request, reply) => {
    try {
      const { uid } = request.params;
      await headerInfoCache.setActiveUser(uid, {
        is_act: true,
        last_active: Date.now()
      });
      
      // Sync to Redis for filter access
      const activeUsers = await headerInfoCache.getAllActiveUsers();
      await filterRedisService.updateHeaderInfo('users', activeUsers);
      
      return { success: true, message: `User ${uid} activated` };
    } catch (error) {
      console.error("Error activating user:", error);
      reply.code(500);
      return { error: "Failed to activate user" };
    }
  });

  fastify.post<{ Params: { uid: string } }>("/header-info/users/:uid/deactivate", async (request, reply) => {
    try {
      const { uid } = request.params;
      await headerInfoCache.updateUserActivity(uid, false);
      return { success: true, message: `User ${uid} deactivated` };
    } catch (error) {
      console.error("Error deactivating user:", error);
      reply.code(500);
      return { error: "Failed to deactivate user" };
    }
  });

  fastify.delete<{ Params: { uid: string } }>("/header-info/users/:uid", async (request, reply) => {
    try {
      const { uid } = request.params;
      await headerInfoCache.removeActiveUser(uid);
      return { success: true, message: `User ${uid} removed` };
    } catch (error) {
      console.error("Error removing user:", error);
      reply.code(500);
      return { error: "Failed to remove user" };
    }
  });

  // Endpoint management
  fastify.post<{ Body: { uid: string; suffix?: string } }>("/header-info/endpoints", async (request, reply) => {
    try {
      const { uid, suffix } = request.body;
      
      if (!uid) {
        reply.code(400);
        return { error: "uid is required" };
      }

      const endpointId = HeaderInfoCacheService.createEndpointId(uid, suffix);
      
      await headerInfoCache.setActiveEndpoint(endpointId, {
        uid,
        is_act: true,
        last_active: Date.now()
      });
      
      // Sync to Redis for filter access
      const activeEndpoints = await headerInfoCache.getAllActiveEndpoints();
      await filterRedisService.updateHeaderInfo('endpoints', activeEndpoints);

      return { 
        success: true, 
        endpointId,
        message: `Endpoint created for user ${uid}` 
      };
    } catch (error) {
      console.error("Error creating endpoint:", error);
      reply.code(500);
      return { error: "Failed to create endpoint" };
    }
  });

  fastify.post<{ 
    Params: { endpointId: string }; 
    Body: { answer: string } 
  }>("/header-info/endpoints/:endpointId/answer", async (request, reply) => {
    try {
      const { endpointId } = request.params;
      const { answer } = request.body;

      if (!answer) {
        reply.code(400);
        return { error: "answer is required" };
      }

      await headerInfoCache.setEndpointAnswer(endpointId, answer);
      return { success: true, message: `Answer set for endpoint ${endpointId}` };
    } catch (error) {
      console.error("Error setting endpoint answer:", error);
      reply.code(500);
      return { error: "Failed to set endpoint answer" };
    }
  });

  fastify.post<{ 
    Params: { endpointId: string }; 
    Body: { functionName: string; functions?: Array<{ id: string; answer: string }> } 
  }>("/header-info/endpoints/:endpointId/next-function", async (request, reply) => {
    try {
      const { endpointId } = request.params;
      const { functionName, functions } = request.body;

      if (!functionName) {
        reply.code(400);
        return { error: "functionName is required" };
      }

      const functionId = HeaderInfoCacheService.createFunctionId(endpointId, functionName);
      
      // Create the next function
      await headerInfoCache.setNextFunction(functionId, {
        id: endpointId,
        functions: functions || []
      });

      // Link it to the endpoint
      await headerInfoCache.setEndpointNextFunction(endpointId, functionId);
      
      // Sync to Redis for filter access
      const nextFunctions = await headerInfoCache.getAllNextFunctions();
      await filterRedisService.updateHeaderInfo('functions', nextFunctions);

      return { 
        success: true, 
        functionId,
        message: `Next function ${functionName} created for endpoint ${endpointId}` 
      };
    } catch (error) {
      console.error("Error setting endpoint next function:", error);
      reply.code(500);
      return { error: "Failed to set endpoint next function" };
    }
  });

  fastify.delete<{ Params: { endpointId: string } }>("/header-info/endpoints/:endpointId", async (request, reply) => {
    try {
      const { endpointId } = request.params;
      
      // Get endpoint to check if it has a next function to clean up
      const endpoint = await headerInfoCache.getActiveEndpoint(endpointId);
      if (endpoint?.next_function) {
        await headerInfoCache.removeNextFunction(endpoint.next_function);
      }
      
      await headerInfoCache.removeActiveEndpoint(endpointId);
      return { success: true, message: `Endpoint ${endpointId} removed` };
    } catch (error) {
      console.error("Error removing endpoint:", error);
      reply.code(500);
      return { error: "Failed to remove endpoint" };
    }
  });

  // Function management
  fastify.post<{ 
    Params: { functionId: string }; 
    Body: { id: string; answer: string } 
  }>("/header-info/functions/:functionId/add-function", async (request, reply) => {
    try {
      const { functionId } = request.params;
      const { id, answer } = request.body;

      if (!id || !answer) {
        reply.code(400);
        return { error: "id and answer are required" };
      }

      await headerInfoCache.addFunctionToNextFunction(functionId, { id, answer });
      return { success: true, message: `Function added to ${functionId}` };
    } catch (error) {
      console.error("Error adding function:", error);
      reply.code(500);
      return { error: "Failed to add function" };
    }
  });

  // Data retrieval endpoints
  fastify.get("/header-info/users", async (request, reply) => {
    try {
      const activeUsers = await headerInfoCache.getAllActiveUsers();
      return { active_users: activeUsers };
    } catch (error) {
      console.error("Error getting active users:", error);
      reply.code(500);
      return { error: "Failed to get active users" };
    }
  });

  fastify.get("/header-info/endpoints", async (request, reply) => {
    try {
      const activeEndpoints = await headerInfoCache.getAllActiveEndpoints();
      return { active_endpoints: activeEndpoints };
    } catch (error) {
      console.error("Error getting active endpoints:", error);
      reply.code(500);
      return { error: "Failed to get active endpoints" };
    }
  });

  fastify.get("/header-info/functions", async (request, reply) => {
    try {
      const nextFunctions = await headerInfoCache.getAllNextFunctions();
      return { next_functions: nextFunctions };
    } catch (error) {
      console.error("Error getting next functions:", error);
      reply.code(500);
      return { error: "Failed to get next functions" };
    }
  });

  // Get all header info for envoy-wasm-filter
  fastify.get("/header-info/all", async (request, reply) => {
    try {
      const headerInfo = await headerInfoCache.getFullHeaderInfo();
      return headerInfo;
    } catch (error) {
      console.error("Error getting full header info:", error);
      reply.code(500);
      return { error: "Failed to get header info" };
    }
  });

  // Utility endpoints
  fastify.delete("/header-info/all", async (request, reply) => {
    try {
      await headerInfoCache.clearAllData();
      return { success: true, message: "All header info data cleared" };
    } catch (error) {
      console.error("Error clearing data:", error);
      reply.code(500);
      return { error: "Failed to clear data" };
    }
  });
}