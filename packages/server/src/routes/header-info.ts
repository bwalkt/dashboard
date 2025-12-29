import type { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import { authService } from "../services/auth.service.js";
import { filterRedisService } from "../services/filter-redis.service.js";
import { HeaderInfoCacheService, headerInfoCache } from "../services/header-info-cache.service.js";

// Authentication middleware for admin routes
async function authenticateAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Check for API key in header or Authorization header
    const apiKey = request.headers['x-api-key'] as string;
    const authHeader = request.headers['authorization'] as string;
    
    let token = apiKey;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    if (!token) {
      reply.code(401);
      throw new Error('Authentication required - provide x-api-key header or Bearer token');
    }
    
    // Validate token
    const authResult = await authService.validateToken(token);
    if (!authResult.valid || !authResult.user) {
      reply.code(401);
      throw new Error('Invalid authentication token');
    }
    
    // Check if user has admin privileges (you may want to add role checking)
    // For now, any valid authenticated user can access header-info endpoints
    // In production, you should add role-based access control
    
    // Store user info in request for later use if needed
    (request as any).user = authResult.user;
    
  } catch (error) {
    reply.code(401);
    throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function headerInfoRoutes(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions,
): Promise<void> {

  // Apply authentication to all routes in this plugin
  fastify.addHook('preHandler', authenticateAdmin);

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
      
      // Check if user exists first
      const user = await headerInfoCache.getActiveUser(uid);
      if (!user) {
        reply.code(404);
        return { error: `User ${uid} not found` };
      }
      
      await headerInfoCache.updateUserActivity(uid, false);
      
      // Sync to Redis for filter access
      const activeUsers = await headerInfoCache.getAllActiveUsers();
      await filterRedisService.updateHeaderInfo('users', activeUsers);
      
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
      
      // Check if user exists first
      const user = await headerInfoCache.getActiveUser(uid);
      if (!user) {
        reply.code(404);
        return { error: `User ${uid} not found` };
      }
      
      await headerInfoCache.removeActiveUser(uid);
      
      // Sync to Redis for filter access
      const activeUsers = await headerInfoCache.getAllActiveUsers();
      await filterRedisService.updateHeaderInfo('users', activeUsers);
      
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

      // Check if endpoint exists first
      const endpoint = await headerInfoCache.getActiveEndpoint(endpointId);
      if (!endpoint) {
        reply.code(404);
        return { error: `Endpoint ${endpointId} not found` };
      }

      await headerInfoCache.setEndpointAnswer(endpointId, answer);
      
      // Sync to Redis for filter access
      const activeEndpoints = await headerInfoCache.getAllActiveEndpoints();
      await filterRedisService.updateHeaderInfo('endpoints', activeEndpoints);
      
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

      // Check if endpoint exists first
      const endpoint = await headerInfoCache.getActiveEndpoint(endpointId);
      if (!endpoint) {
        reply.code(404);
        return { error: `Endpoint ${endpointId} not found` };
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
      
      // Check if endpoint exists first
      const endpoint = await headerInfoCache.getActiveEndpoint(endpointId);
      if (!endpoint) {
        reply.code(404);
        return { error: `Endpoint ${endpointId} not found` };
      }
      
      // Clean up next function if it exists
      if (endpoint.next_function) {
        await headerInfoCache.removeNextFunction(endpoint.next_function);
      }
      
      await headerInfoCache.removeActiveEndpoint(endpointId);
      
      // Sync to Redis for filter access
      const activeEndpoints = await headerInfoCache.getAllActiveEndpoints();
      await filterRedisService.updateHeaderInfo('endpoints', activeEndpoints);
      
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

      // Check if function exists first
      const nextFunction = await headerInfoCache.getNextFunction(functionId);
      if (!nextFunction) {
        reply.code(404);
        return { error: `Function ${functionId} not found` };
      }

      await headerInfoCache.addFunctionToNextFunction(functionId, { id, answer });
      
      // Sync to Redis for filter access
      const nextFunctions = await headerInfoCache.getAllNextFunctions();
      await filterRedisService.updateHeaderInfo('functions', nextFunctions);
      
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
  fastify.delete<{ 
    Querystring: { confirm?: string; environment?: string } 
  }>("/header-info/all", async (request, reply) => {
    try {
      // Safety check 1: Require explicit confirmation
      if (request.query.confirm !== 'DELETE_ALL_DATA') {
        reply.code(400);
        return { 
          error: "Destructive operation requires confirmation. Add ?confirm=DELETE_ALL_DATA to proceed.",
          warning: "This will permanently delete ALL user data, endpoints, and functions." 
        };
      }

      // Safety check 2: Environment restriction (if specified)
      const currentEnv = process.env.NODE_ENV || 'development';
      if (request.query.environment && request.query.environment !== currentEnv) {
        reply.code(400);
        return { 
          error: `Environment mismatch. Current: ${currentEnv}, Required: ${request.query.environment}` 
        };
      }

      // Safety check 3: Prevent in production without explicit override
      if (currentEnv === 'production' && request.query.environment !== 'production') {
        reply.code(403);
        return { 
          error: "Cannot clear data in production without explicit environment confirmation",
          hint: "Add &environment=production if you really want to do this in production" 
        };
      }

      // Log the destructive operation for audit trail
      const user = (request as any).user;
      console.warn(`🚨 DESTRUCTIVE OPERATION: User ${user?.email || 'unknown'} (${user?.id || 'unknown'}) is clearing ALL header info data in ${currentEnv} environment`);

      await headerInfoCache.clearAllData();
      
      // Also clear Redis data
      await filterRedisService.updateHeaderInfo('users', {});
      await filterRedisService.updateHeaderInfo('endpoints', {});
      await filterRedisService.updateHeaderInfo('functions', {});

      console.warn(`✅ ALL HEADER INFO DATA CLEARED by user ${user?.email || 'unknown'} in ${currentEnv} environment`);
      
      return { 
        success: true, 
        message: "All header info data cleared",
        warning: "This action cannot be undone",
        clearedAt: new Date().toISOString(),
        clearedBy: user?.email || 'unknown'
      };
    } catch (error) {
      console.error("Error clearing data:", error);
      reply.code(500);
      return { error: "Failed to clear data" };
    }
  });
}