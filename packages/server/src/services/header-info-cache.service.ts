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
    return result ? JSON.parse(result) : null;
  }

  async getAllActiveUsers(): Promise<Record<string, ActiveUser>> {
    const result = await redis.getClient().hgetall(HeaderInfoCacheService.ACTIVE_USERS_KEY);
    const activeUsers: Record<string, ActiveUser> = {};
    
    for (const [uid, data] of Object.entries(result)) {
      activeUsers[uid] = JSON.parse(data);
    }
    
    return activeUsers;
  }

  async removeActiveUser(uid: string): Promise<void> {
    await redis.getClient().hdel(HeaderInfoCacheService.ACTIVE_USERS_KEY, uid);
  }

  async updateUserActivity(uid: string, isActive: boolean): Promise<void> {
    const user = await this.getActiveUser(uid);
    if (user) {
      user.is_act = isActive;
      user.last_active = Date.now();
      await this.setActiveUser(uid, user);
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
    return result ? JSON.parse(result) : null;
  }

  async getAllActiveEndpoints(): Promise<Record<string, ActiveEndpoint>> {
    const result = await redis.getClient().hgetall(HeaderInfoCacheService.ACTIVE_ENDPOINTS_KEY);
    const activeEndpoints: Record<string, ActiveEndpoint> = {};
    
    for (const [endpointId, data] of Object.entries(result)) {
      activeEndpoints[endpointId] = JSON.parse(data);
    }
    
    return activeEndpoints;
  }

  async removeActiveEndpoint(endpointId: string): Promise<void> {
    await redis.getClient().hdel(HeaderInfoCacheService.ACTIVE_ENDPOINTS_KEY, endpointId);
  }

  async updateEndpointActivity(endpointId: string, isActive: boolean): Promise<void> {
    const endpoint = await this.getActiveEndpoint(endpointId);
    if (endpoint) {
      endpoint.is_act = isActive;
      endpoint.last_active = Date.now();
      await this.setActiveEndpoint(endpointId, endpoint);
    }
  }

  async setEndpointAnswer(endpointId: string, answer: string): Promise<void> {
    const endpoint = await this.getActiveEndpoint(endpointId);
    if (endpoint) {
      endpoint.answer = answer;
      await this.setActiveEndpoint(endpointId, endpoint);
    }
  }

  async setEndpointNextFunction(endpointId: string, nextFunctionId: string): Promise<void> {
    const endpoint = await this.getActiveEndpoint(endpointId);
    if (endpoint) {
      endpoint.next_function = nextFunctionId;
      await this.setActiveEndpoint(endpointId, endpoint);
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
    return result ? JSON.parse(result) : null;
  }

  async getAllNextFunctions(): Promise<Record<string, NextFunction>> {
    const result = await redis.getClient().hgetall(HeaderInfoCacheService.NEXT_FUNCTIONS_KEY);
    const nextFunctions: Record<string, NextFunction> = {};
    
    for (const [functionId, data] of Object.entries(result)) {
      nextFunctions[functionId] = JSON.parse(data);
    }
    
    return nextFunctions;
  }

  async removeNextFunction(functionId: string): Promise<void> {
    await redis.getClient().hdel(HeaderInfoCacheService.NEXT_FUNCTIONS_KEY, functionId);
  }

  async addFunctionToNextFunction(functionId: string, functionEntry: { id: string; answer: string }): Promise<void> {
    const nextFunction = await this.getNextFunction(functionId);
    if (nextFunction) {
      nextFunction.functions.push(functionEntry);
      await this.setNextFunction(functionId, nextFunction);
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
    return suffix ? `${uid}-${suffix}-${timestamp}` : `${uid}-endpoint-${timestamp}`;
  }

  // Helper method to create a new function ID
  static createFunctionId(endpointId: string, functionName: string): string {
    const timestamp = Date.now();
    return `${endpointId}-${functionName}-${timestamp}`;
  }
}

// Export singleton instance
export const headerInfoCache = new HeaderInfoCacheService();