import crypto from "crypto";
import { redis } from "../config/redis.js";
import { headerInfoCache } from "./header-info-cache.service.js";

// Redis keys structure for filter-server communication
const REDIS_KEYS = {
  // Challenge validation
  CHALLENGE_QUEUE: "filter:challenge:queue",           // List for pending validations
  CHALLENGE_RESULTS: "filter:challenge:results:",      // Hash for results (with requestId suffix)
  CHALLENGE_CACHE: "filter:challenge:cache:",          // String for cached challenges
  
  // Header info
  HEADER_INFO: "filter:header:info",                   // Hash containing all header info
  HEADER_UPDATE_CHANNEL: "filter:header:updates",      // Pub/sub channel for updates
  
  // Filter management
  FILTER_REGISTRY: "filter:registry",                  // Hash of registered filters
  FILTER_HEARTBEAT: "filter:heartbeat:",               // String with filter ID suffix
  FILTER_METRICS: "filter:metrics:",                   // Hash with filter ID suffix
  
  // Request/Response
  REQUEST_QUEUE: "filter:request:queue:",              // List with filter ID suffix
  RESPONSE_QUEUE: "filter:response:queue:",            // List with filter ID suffix
  
  // Security
  AUTH_TOKENS: "filter:auth:tokens:",                  // Set of valid tokens
  RATE_LIMIT: "filter:ratelimit:",                     // String with filter ID suffix
};

export interface RedisFilterRequest {
  requestId: string;
  filterId: string;
  timestamp: number;
  type: 'challenge_validation' | 'header_info' | 'filter_register';
  payload: any;
}

export interface RedisFilterResponse {
  requestId: string;
  timestamp: number;
  status: 'success' | 'error';
  data?: any;
  error?: string;
}

export interface FilterRegistration {
  filterId: string;
  envoyNodeId: string;
  registeredAt: number;
  lastHeartbeat: number;
  status: 'active' | 'inactive';
}

export class FilterRedisService {
  private static readonly CHALLENGE_CACHE_TTL = 300; // 5 minutes
  private static readonly HEARTBEAT_TTL = 60; // 1 minute
  private static readonly REQUEST_TTL = 30; // 30 seconds for request/response
  private static readonly RATE_LIMIT_WINDOW = 60; // 1 minute
  private static readonly MAX_REQUESTS_PER_WINDOW = 1000;

  constructor() {
    this.initializePubSub();
    this.startMaintenanceWorker();
  }

  // Initialize Redis pub/sub for real-time updates
  private async initializePubSub(): Promise<void> {
    const subscriber = redis.getClient().duplicate();
    await subscriber.connect();

    // Subscribe to header update channel
    await subscriber.subscribe(REDIS_KEYS.HEADER_UPDATE_CHANNEL, (message: string) => {
      console.log(`📡 Header update received: ${message}`);
      // Filters will see this update when they poll or subscribe
    });

    console.log("✅ Redis pub/sub initialized for filter communication");
  }

  // Start maintenance worker to clean up expired data
  private async startMaintenanceWorker(): Promise<void> {
    setInterval(async () => {
      try {
        await this.cleanupExpiredData();
        await this.checkFilterHealth();
      } catch (error) {
        console.error("Maintenance worker error:", error);
      }
    }, 30000); // Run every 30 seconds
  }

  // Register a filter
  async registerFilter(filterId: string, envoyNodeId: string): Promise<void> {
    const registration: FilterRegistration = {
      filterId,
      envoyNodeId,
      registeredAt: Date.now(),
      lastHeartbeat: Date.now(),
      status: 'active'
    };

    await redis.getClient().hset(
      REDIS_KEYS.FILTER_REGISTRY,
      filterId,
      JSON.stringify(registration)
    );

    console.log(`✅ Filter registered: ${filterId} (node: ${envoyNodeId})`);
  }

  // Update filter heartbeat
  async updateHeartbeat(filterId: string, metrics?: any): Promise<void> {
    const key = REDIS_KEYS.FILTER_HEARTBEAT + filterId;
    const heartbeatData = {
      timestamp: Date.now(),
      metrics: metrics || {}
    };

    await redis.set(key, JSON.stringify(heartbeatData), FilterRedisService.HEARTBEAT_TTL);

    // Update registry
    const registrationData = await redis.getClient().hget(REDIS_KEYS.FILTER_REGISTRY, filterId);
    if (registrationData) {
      const registration: FilterRegistration = JSON.parse(registrationData);
      registration.lastHeartbeat = Date.now();
      registration.status = 'active';
      await redis.getClient().hset(
        REDIS_KEYS.FILTER_REGISTRY,
        filterId,
        JSON.stringify(registration)
      );
    }
  }

  // Add challenge validation request to queue
  async queueChallengeValidation(
    requestId: string,
    filterId: string,
    challengeId: string,
    challengeAnswer: string
  ): Promise<void> {
    const request: RedisFilterRequest = {
      requestId,
      filterId,
      timestamp: Date.now(),
      type: 'challenge_validation',
      payload: { challengeId, challengeAnswer }
    };

    // Check cache first
    const cacheKey = REDIS_KEYS.CHALLENGE_CACHE + challengeId;
    const cachedAnswer = await redis.get(cacheKey);

    if (cachedAnswer) {
      // Validate against cache
      const isValid = cachedAnswer === challengeAnswer;
      await this.setChallengeResult(requestId, isValid, isValid ? null : "Invalid answer");
      return;
    }

    // Add to queue for processing
    await redis.getClient().lpush(
      REDIS_KEYS.CHALLENGE_QUEUE,
      JSON.stringify(request)
    );

    console.log(`📥 Challenge validation queued: ${requestId}`);
  }

  // Process challenge validation queue
  async processChallengeQueue(): Promise<void> {
    while (true) {
      const data = await redis.getClient().brpop(REDIS_KEYS.CHALLENGE_QUEUE, 1);
      
      if (data) {
        const [, value] = data;
        const request: RedisFilterRequest = JSON.parse(value);
        
        try {
          // Validate challenge (integrate with existing auth service)
          const isValid = await this.validateChallenge(
            request.payload.challengeId,
            request.payload.challengeAnswer
          );

          // Store result
          await this.setChallengeResult(request.requestId, isValid);

          // Cache if valid
          if (isValid) {
            const cacheKey = REDIS_KEYS.CHALLENGE_CACHE + request.payload.challengeId;
            await redis.set(
              cacheKey,
              request.payload.challengeAnswer,
              FilterRedisService.CHALLENGE_CACHE_TTL
            );
          }

          console.log(`✅ Challenge processed: ${request.requestId} - ${isValid ? 'valid' : 'invalid'}`);
        } catch (error) {
          console.error(`Error processing challenge ${request.requestId}:`, error);
          await this.setChallengeResult(request.requestId, false, "Processing error");
        }
      }
    }
  }

  // Set challenge validation result
  private async setChallengeResult(
    requestId: string,
    isValid: boolean,
    error?: string | null
  ): Promise<void> {
    const resultKey = REDIS_KEYS.CHALLENGE_RESULTS + requestId;
    const result: RedisFilterResponse = {
      requestId,
      timestamp: Date.now(),
      status: isValid ? 'success' : 'error',
      data: { valid: isValid },
      error: error || undefined
    };

    await redis.set(resultKey, JSON.stringify(result), FilterRedisService.REQUEST_TTL);
  }

  // Get challenge validation result (for filter to poll)
  async getChallengeResult(requestId: string): Promise<RedisFilterResponse | null> {
    const resultKey = REDIS_KEYS.CHALLENGE_RESULTS + requestId;
    const result = await redis.get(resultKey);
    
    if (result) {
      // Delete after reading (consume once)
      await redis.delete(resultKey);
      return JSON.parse(result);
    }
    
    return null;
  }

  // Update header info in Redis
  async updateHeaderInfo(type: 'users' | 'endpoints' | 'functions', data: any): Promise<void> {
    const headerInfo = await this.getHeaderInfo();
    
    switch (type) {
      case 'users':
        headerInfo.active_users = data;
        break;
      case 'endpoints':
        headerInfo.active_endpoints = data;
        break;
      case 'functions':
        headerInfo.next_functions = data;
        break;
    }

    await redis.getClient().hset(
      REDIS_KEYS.HEADER_INFO,
      type,
      JSON.stringify(data)
    );

    // Publish update notification
    await redis.getClient().publish(
      REDIS_KEYS.HEADER_UPDATE_CHANNEL,
      JSON.stringify({
        type,
        timestamp: Date.now(),
        dataHash: crypto.createHash('md5').update(JSON.stringify(data)).digest('hex')
      })
    );

    console.log(`📢 Header info updated: ${type}`);
  }

  // Get all header info
  async getHeaderInfo(): Promise<any> {
    const data = await redis.getClient().hgetall(REDIS_KEYS.HEADER_INFO);
    
    return {
      active_users: data.users ? JSON.parse(data.users) : {},
      active_endpoints: data.endpoints ? JSON.parse(data.endpoints) : {},
      next_functions: data.functions ? JSON.parse(data.functions) : {}
    };
  }

  // Sync header info from cache service
  async syncHeaderInfoFromCache(): Promise<void> {
    const headerInfo = await headerInfoCache.getFullHeaderInfo();
    
    await this.updateHeaderInfo('users', headerInfo.active_users);
    await this.updateHeaderInfo('endpoints', headerInfo.active_endpoints);
    await this.updateHeaderInfo('functions', headerInfo.next_functions);
    
    console.log("🔄 Header info synced to Redis");
  }

  // Rate limiting
  async checkRateLimit(filterId: string): Promise<boolean> {
    const key = REDIS_KEYS.RATE_LIMIT + filterId;
    const current = await redis.getClient().incr(key);
    
    if (current === 1) {
      await redis.getClient().expire(key, FilterRedisService.RATE_LIMIT_WINDOW);
    }
    
    return current <= FilterRedisService.MAX_REQUESTS_PER_WINDOW;
  }

  // Get filter statistics
  async getFilterStats(): Promise<any> {
    const registryData = await redis.getClient().hgetall(REDIS_KEYS.FILTER_REGISTRY);
    const filters: FilterRegistration[] = [];
    
    for (const [filterId, data] of Object.entries(registryData)) {
      filters.push(JSON.parse(data));
    }

    const activeFilters = filters.filter(f => f.status === 'active');
    const inactiveFilters = filters.filter(f => f.status === 'inactive');

    return {
      total: filters.length,
      active: activeFilters.length,
      inactive: inactiveFilters.length,
      filters: filters.map(f => ({
        filterId: f.filterId,
        envoyNodeId: f.envoyNodeId,
        status: f.status,
        registeredAt: new Date(f.registeredAt).toISOString(),
        lastHeartbeat: new Date(f.lastHeartbeat).toISOString(),
        uptime: Date.now() - f.registeredAt
      }))
    };
  }

  // Clean up expired data
  private async cleanupExpiredData(): Promise<void> {
    // Clean up old request/response queues
    const keys = await redis.getClient().keys('filter:challenge:results:*');
    
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl === -1) {
        // No TTL set, check age
        const data = await redis.get(key);
        if (data) {
          const parsed = JSON.parse(data);
          const age = Date.now() - parsed.timestamp;
          if (age > FilterRedisService.REQUEST_TTL * 1000) {
            await redis.delete(key);
            console.log(`🗑️  Cleaned up expired result: ${key}`);
          }
        }
      }
    }
  }

  // Check filter health
  private async checkFilterHealth(): Promise<void> {
    const registryData = await redis.getClient().hgetall(REDIS_KEYS.FILTER_REGISTRY);
    
    for (const [filterId, data] of Object.entries(registryData)) {
      const registration: FilterRegistration = JSON.parse(data);
      const timeSinceHeartbeat = Date.now() - registration.lastHeartbeat;
      
      // Mark as inactive if no heartbeat for 2 minutes
      if (timeSinceHeartbeat > 120000 && registration.status === 'active') {
        registration.status = 'inactive';
        await redis.getClient().hset(
          REDIS_KEYS.FILTER_REGISTRY,
          filterId,
          JSON.stringify(registration)
        );
        console.log(`⚠️  Filter marked inactive: ${filterId}`);
      }
    }
  }

  // Placeholder for actual challenge validation
  private async validateChallenge(challengeId: string, challengeAnswer: string): Promise<boolean> {
    // This should integrate with your existing challenge validation logic
    // For now, returning true as placeholder
    console.log(`🔐 Validating challenge ${challengeId}`);
    return true;
  }

  // Generate secure token for filter authentication
  static generateFilterToken(filterId: string): string {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    const data = `${filterId}:${timestamp}:${nonce}`;
    const signature = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'secret')
      .update(data)
      .digest('hex');
    
    return Buffer.from(JSON.stringify({
      filterId,
      timestamp,
      nonce,
      signature
    })).toString('base64');
  }

  // Validate filter token
  static async validateFilterToken(token: string): Promise<{ valid: boolean; filterId?: string }> {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      const { filterId, timestamp, nonce, signature } = decoded;
      
      // Check timestamp (5 minute validity)
      const age = Date.now() - timestamp;
      if (age > 300000) {
        return { valid: false };
      }
      
      // Verify signature
      const data = `${filterId}:${timestamp}:${nonce}`;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'secret')
        .update(data)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return { valid: false };
      }
      
      return { valid: true, filterId };
    } catch (error) {
      return { valid: false };
    }
  }
}

// Export singleton instance
export const filterRedisService = new FilterRedisService();

// Start challenge queue processor
filterRedisService.processChallengeQueue().catch(console.error);