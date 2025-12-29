import { randomBytes } from "crypto";
import { redis } from "../config/redis.js";

// Type definitions for Redis data structures
export interface ActiveUser {
  uid: string;
  is_act: boolean;
  last_active: number; // timestamp
}

export interface ActiveEndpoint {
  id: string; // uid-endpoint-id
  uid: string;
  is_act: boolean;
  last_active: number; // timestamp
  next_function?: string; // references id in next_functions
  answer?: string;
}

export interface NextFunction {
  id: string; // references uid-endpoint-id
  functions: Array<{
    id: string; // next-function id
    answer: string;
  }>;
}

export class HeaderInfoCacheService {
  private static readonly ACTIVE_USERS_KEY = "active_users";
  private static readonly ACTIVE_ENDPOINTS_KEY = "active_endpoints";
  private static readonly NEXT_FUNCTIONS_KEY = "next_functions";

  // Active Users operations
  async setActiveUser(uid: string, userData: Omit<ActiveUser, 'uid'>): Promise<void> {
    const user: ActiveUser = { uid, ...userData };
    await redis.getClient().hset(
      HeaderInfoCacheService.ACTIVE_USERS_KEY,
      uid,
      JSON.stringify(user)
    );
  }

  async getActiveUser(uid: string): Promise<ActiveUser | null> {
    const result = await redis.getClient().hget(
      HeaderInfoCacheService.ACTIVE_USERS_KEY,
      uid
    );
    if (!result) return null;
    try {
      return JSON.parse(result);
    } catch (e) {
      console.error(`Failed to parse user data for ${uid}:`, e);
      return null;
    }
  }

  async getAllActiveUsers(): Promise<Record<string, ActiveUser>> {
    const result = await redis.getClient().hgetall(HeaderInfoCacheService.ACTIVE_USERS_KEY);
    const activeUsers: Record<string, ActiveUser> = {};
    
    for (const [uid, data] of Object.entries(result)) {
      try {
        activeUsers[uid] = JSON.parse(data);
      } catch (e) {
        console.error(`Failed to parse user data for ${uid}:`, e);
        // Skip malformed entries instead of failing the entire operation
      }
    }
    
    return activeUsers;
  }

  async removeActiveUser(uid: string): Promise<void> {
    await redis.getClient().hdel(HeaderInfoCacheService.ACTIVE_USERS_KEY, uid);
  }

  async updateUserActivity(uid: string, isActive: boolean): Promise<void> {
    const script = `
      local data = redis.call('HGET', KEYS[1], ARGV[1])
      if data then
        local user = cjson.decode(data)
        user.is_act = ARGV[2] == 'true'
        user.last_active = tonumber(ARGV[3])
        redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(user))
        return 1
      end
      return 0
    `;
    
    const result = await redis.getClient().eval(
      script,
      1,
      HeaderInfoCacheService.ACTIVE_USERS_KEY,
      uid,
      String(isActive),
      String(Date.now())
    ) as number;
    
    if (result === 0) {
      console.warn(`updateUserActivity: User ${uid} not found`);
    }
  }

  // Active Endpoints operations
  async setActiveEndpoint(endpointId: string, endpointData: Omit<ActiveEndpoint, 'id'>): Promise<void> {
    const endpoint: ActiveEndpoint = { id: endpointId, ...endpointData };
    await redis.getClient().hset(
      HeaderInfoCacheService.ACTIVE_ENDPOINTS_KEY,
      endpointId,
      JSON.stringify(endpoint)
    );
  }

  async getActiveEndpoint(endpointId: string): Promise<ActiveEndpoint | null> {
    const result = await redis.getClient().hget(
      HeaderInfoCacheService.ACTIVE_ENDPOINTS_KEY,
      endpointId
    );
    if (!result) return null;
    try {
      return JSON.parse(result);
    } catch (e) {
      console.error(`Failed to parse endpoint data for ${endpointId}:`, e);
      return null;
    }
  }

  async getAllActiveEndpoints(): Promise<Record<string, ActiveEndpoint>> {
    const result = await redis.getClient().hgetall(HeaderInfoCacheService.ACTIVE_ENDPOINTS_KEY);
    const activeEndpoints: Record<string, ActiveEndpoint> = {};
    
    for (const [endpointId, data] of Object.entries(result)) {
      try {
        activeEndpoints[endpointId] = JSON.parse(data);
      } catch (e) {
        console.error(`Failed to parse endpoint data for ${endpointId}:`, e);
        // Skip malformed entries instead of failing the entire operation
      }
    }
    
    return activeEndpoints;
  }

  async removeActiveEndpoint(endpointId: string): Promise<void> {
    await redis.getClient().hdel(HeaderInfoCacheService.ACTIVE_ENDPOINTS_KEY, endpointId);
  }

  async updateEndpointActivity(endpointId: string, isActive: boolean): Promise<void> {
    const script = `
      local data = redis.call('HGET', KEYS[1], ARGV[1])
      if data then
        local endpoint = cjson.decode(data)
        endpoint.is_act = ARGV[2] == 'true'
        endpoint.last_active = tonumber(ARGV[3])
        redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(endpoint))
        return 1
      end
      return 0
    `;
    
    const result = await redis.getClient().eval(
      script,
      1,
      HeaderInfoCacheService.ACTIVE_ENDPOINTS_KEY,
      endpointId,
      String(isActive),
      String(Date.now())
    ) as number;
    
    if (result === 0) {
      console.warn(`updateEndpointActivity: Endpoint ${endpointId} not found`);
    }
  }

  async setEndpointAnswer(endpointId: string, answer: string): Promise<void> {
    const script = `
      local data = redis.call('HGET', KEYS[1], ARGV[1])
      if data then
        local endpoint = cjson.decode(data)
        endpoint.answer = ARGV[2]
        redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(endpoint))
        return 1
      end
      return 0
    `;
    
    const result = await redis.getClient().eval(
      script,
      1,
      HeaderInfoCacheService.ACTIVE_ENDPOINTS_KEY,
      endpointId,
      answer
    ) as number;
    
    if (result === 0) {
      console.warn(`setEndpointAnswer: Endpoint ${endpointId} not found`);
    }
  }

  async setEndpointNextFunction(endpointId: string, nextFunctionId: string): Promise<void> {
    const script = `
      local data = redis.call('HGET', KEYS[1], ARGV[1])
      if data then
        local endpoint = cjson.decode(data)
        endpoint.next_function = ARGV[2]
        redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(endpoint))
        return 1
      end
      return 0
    `;
    
    const result = await redis.getClient().eval(
      script,
      1,
      HeaderInfoCacheService.ACTIVE_ENDPOINTS_KEY,
      endpointId,
      nextFunctionId
    ) as number;
    
    if (result === 0) {
      console.warn(`setEndpointNextFunction: Endpoint ${endpointId} not found`);
    }
  }

  // Next Functions operations
  async setNextFunction(functionId: string, functionData: NextFunction): Promise<void> {
    await redis.getClient().hset(
      HeaderInfoCacheService.NEXT_FUNCTIONS_KEY,
      functionId,
      JSON.stringify(functionData)
    );
  }

  async getNextFunction(functionId: string): Promise<NextFunction | null> {
    const result = await redis.getClient().hget(
      HeaderInfoCacheService.NEXT_FUNCTIONS_KEY,
      functionId
    );
    if (!result) return null;
    try {
      return JSON.parse(result);
    } catch (e) {
      console.error(`Failed to parse function data for ${functionId}:`, e);
      return null;
    }
  }

  async getAllNextFunctions(): Promise<Record<string, NextFunction>> {
    const result = await redis.getClient().hgetall(HeaderInfoCacheService.NEXT_FUNCTIONS_KEY);
    const nextFunctions: Record<string, NextFunction> = {};
    
    for (const [functionId, data] of Object.entries(result)) {
      try {
        nextFunctions[functionId] = JSON.parse(data);
      } catch (e) {
        console.error(`Failed to parse function data for ${functionId}:`, e);
        // Skip malformed entries instead of failing the entire operation
      }
    }
    
    return nextFunctions;
  }

  async removeNextFunction(functionId: string): Promise<void> {
    await redis.getClient().hdel(HeaderInfoCacheService.NEXT_FUNCTIONS_KEY, functionId);
  }

  async addFunctionToNextFunction(functionId: string, functionEntry: { id: string; answer: string }): Promise<void> {
    const script = `
      local data = redis.call('HGET', KEYS[1], ARGV[1])
      if data then
        local nextFunction = cjson.decode(data)
        local newEntry = { id = ARGV[2], answer = ARGV[3] }
        table.insert(nextFunction.functions, newEntry)
        redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(nextFunction))
        return 1
      end
      return 0
    `;
    
    const result = await redis.getClient().eval(
      script,
      1,
      HeaderInfoCacheService.NEXT_FUNCTIONS_KEY,
      functionId,
      functionEntry.id,
      functionEntry.answer
    ) as number;
    
    if (result === 0) {
      console.warn(`addFunctionToNextFunction: Function ${functionId} not found`);
    }
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    await redis.getClient().del(
      HeaderInfoCacheService.ACTIVE_USERS_KEY,
      HeaderInfoCacheService.ACTIVE_ENDPOINTS_KEY,
      HeaderInfoCacheService.NEXT_FUNCTIONS_KEY
    );
  }

  async getFullHeaderInfo(): Promise<{
    active_users: Record<string, ActiveUser>;
    active_endpoints: Record<string, ActiveEndpoint>;
    next_functions: Record<string, NextFunction>;
  }> {
    const [activeUsers, activeEndpoints, nextFunctions] = await Promise.all([
      this.getAllActiveUsers(),
      this.getAllActiveEndpoints(),
      this.getAllNextFunctions()
    ]);

    return {
      active_users: activeUsers,
      active_endpoints: activeEndpoints,
      next_functions: nextFunctions
    };
  }

  // Helper method to create a new endpoint ID
  static createEndpointId(uid: string, suffix?: string): string {
    const timestamp = Date.now();
    const random = randomBytes(4).toString('hex');
    return suffix ? `${uid}-${suffix}-${timestamp}-${random}` : `${uid}-endpoint-${timestamp}-${random}`;
  }

  // Helper method to create a new function ID
  static createFunctionId(endpointId: string, functionName: string): string {
    const timestamp = Date.now();
    const random = randomBytes(4).toString('hex');
    return `${endpointId}-${functionName}-${timestamp}-${random}`;
  }
}

// Export singleton instance
export const headerInfoCache = new HeaderInfoCacheService();