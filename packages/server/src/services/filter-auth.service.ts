import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { config } from "../config/env.js";
import { redis } from "../config/redis.js";

export interface FilterAuthToken {
  filterId: string;
  signature: string;
  timestamp: number;
  nonce: string;
  envoyNodeId?: string;
}

export interface FilterIdentity {
  filterId: string;
  instanceId: string;
  envoyNodeId: string;
  createdAt: number;
  lastSeen: number;
  isActive: boolean;
}

export class FilterAuthService {
  private static readonly FILTER_SECRET = config.JWT_SECRET + "_FILTER_AUTH";
  private static readonly TOKEN_VALIDITY_SECONDS = Math.max(1, parseInt(process.env.FILTER_TOKEN_VALIDITY_SECONDS || "300", 10)); // Default: 5 minutes
  private static readonly NONCE_CACHE_TTL = Math.max(1, parseInt(process.env.FILTER_NONCE_CACHE_TTL || "600", 10)); // Default: 10 minutes
  private static readonly MAX_CLOCK_SKEW = Math.max(0, parseInt(process.env.FILTER_MAX_CLOCK_SKEW || "30", 10)); // Default: 30 seconds
  private static readonly MESSAGE_VALIDITY_SECONDS = Math.max(1, parseInt(process.env.FILTER_MESSAGE_VALIDITY_SECONDS || "120", 10)); // Default: 2 minutes

  // Generate a secure authentication token for the filter
  static generateAuthToken(filterId: string, envoyNodeId?: string): FilterAuthToken {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(16).toString('hex');
    
    const message = `${filterId}:${timestamp}:${nonce}:${envoyNodeId ?? ''}`;
    const signature = createHmac('sha256', this.FILTER_SECRET)
      .update(message)
      .digest('hex');

    const token: FilterAuthToken = {
      filterId,
      signature,
      timestamp,
      nonce
    };
    
    if (envoyNodeId !== undefined) {
      token.envoyNodeId = envoyNodeId;
    }
    
    return token;
  }

  // Validate filter authentication token
  static async validateAuthToken(token: FilterAuthToken): Promise<{ valid: boolean; reason?: string }> {
    try {
      const { filterId, signature, timestamp, nonce } = token;
      
      // Check timestamp validity (prevent replay attacks)
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDiff = Math.abs(currentTime - timestamp);
      
      if (timeDiff > this.TOKEN_VALIDITY_SECONDS + this.MAX_CLOCK_SKEW) {
        return { valid: false, reason: "Token expired or invalid timestamp" };
      }

      // Validate signature first (cheaper operation)
      const expectedMessage = `${filterId}:${timestamp}:${nonce}:${token.envoyNodeId ?? ''}`;
      const expectedSignature = createHmac('sha256', this.FILTER_SECRET)
        .update(expectedMessage)
        .digest('hex');

      // Check signature format and length first
      if (signature.length !== expectedSignature.length) {
        return { valid: false, reason: "Invalid signature" };
      }

      if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
        return { valid: false, reason: "Invalid signature" };
      }

      // Atomically check and mark nonce as used (prevent replay attacks)
      const nonceKey = `filter_nonce:${nonce}`;
      const wasSet = await redis.getClient().set(
        nonceKey, 
        "used", 
        "EX", 
        this.NONCE_CACHE_TTL, 
        "NX"
      );
      
      if (!wasSet) {
        return { valid: false, reason: "Token already used (nonce replay)" };
      }

      return { valid: true };
    } catch (error) {
      console.error("Filter auth validation error:", error);
      return { valid: false, reason: "Validation error" };
    }
  }

  // Register a new filter instance
  static async registerFilter(filterId: string, envoyNodeId: string, instanceId?: string): Promise<string> {
    const actualInstanceId = instanceId || randomBytes(8).toString('hex');
    
    const filterIdentity: FilterIdentity = {
      filterId,
      instanceId: actualInstanceId,
      envoyNodeId,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      isActive: true
    };

    const key = `filter_identity:${filterId}:${actualInstanceId}`;
    await redis.set(key, JSON.stringify(filterIdentity), 3600); // 1 hour TTL

    // Add to active filters set
    await redis.getClient().sadd("active_filters", `${filterId}:${actualInstanceId}`);

    console.log(`✅ Registered filter: ${filterId} (instance: ${actualInstanceId}, envoy: ${envoyNodeId})`);
    return actualInstanceId;
  }

  // Update filter last seen timestamp
  static async updateFilterActivity(filterId: string, instanceId: string): Promise<void> {
    const key = `filter_identity:${filterId}:${instanceId}`;
    const identityData = await redis.get(key);
    
    if (identityData) {
      const identity: FilterIdentity = JSON.parse(identityData);
      identity.lastSeen = Date.now();
      identity.isActive = true;
      
      await redis.set(key, JSON.stringify(identity), 3600);
    }
  }

  // Get filter identity
  static async getFilterIdentity(filterId: string, instanceId: string): Promise<FilterIdentity | null> {
    const key = `filter_identity:${filterId}:${instanceId}`;
    const identityData = await redis.get(key);
    
    return identityData ? JSON.parse(identityData) : null;
  }

  // Check if a specific filter is active (optimized for channel authorization)
  static async isFilterActive(filterId: string): Promise<boolean> {
    try {
      // Get all active filter references for this filterId
      const activeFilterIds = await redis.getClient().smembers("active_filters");
      const filterRefs = activeFilterIds.filter(ref => {
        const colonIndex = ref.indexOf(':');
        return colonIndex !== -1 && ref.substring(0, colonIndex) === filterId;
      });

      if (filterRefs.length === 0) {
        return false;
      }

      // Check if at least one instance is still active
      const pipeline = redis.getClient().pipeline();
      const checks: Array<{ instanceId: string; ref: string }> = [];
      
      for (const filterRef of filterRefs) {
        const colonIndex = filterRef.indexOf(':');
        const instanceId = filterRef.substring(colonIndex + 1);
        if (!instanceId) continue;
        
        const key = `filter_identity:${filterId}:${instanceId}`;
        pipeline.get(key);
        checks.push({ instanceId, ref: filterRef });
      }
      
      const results = await pipeline.exec();
      if (!results) return false;
      
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const inactiveFilters: string[] = [];
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const check = checks[i];
        if (!result || !check) {
          if (check) inactiveFilters.push(check.ref);
          continue;
        }
        
        const [error, identityData] = result;
        if (error || !identityData) {
          inactiveFilters.push(check.ref);
          continue;
        }
        
        try {
          const identity: FilterIdentity = JSON.parse(identityData as string);
          if (identity.lastSeen > fiveMinutesAgo && identity.isActive) {
            // Found at least one active instance
            return true;
          } else {
            inactiveFilters.push(check.ref);
          }
        } catch (parseError) {
          inactiveFilters.push(check.ref);
        }
      }
      
      // Clean up inactive filters
      if (inactiveFilters.length > 0) {
        await redis.getClient().srem("active_filters", ...inactiveFilters);
      }
      
      return false;
    } catch (error) {
      console.error(`Error checking if filter ${filterId} is active:`, error);
      return false;
    }
  }

  // Get all active filters (optimized with pipeline)
  static async getActiveFilters(): Promise<FilterIdentity[]> {
    const activeFilterIds = await redis.getClient().smembers("active_filters");
    if (activeFilterIds.length === 0) return [];

    // Use pipeline for efficient bulk Redis operations
    const pipeline = redis.getClient().pipeline();
    const filterRefs: Array<{ filterId: string; instanceId: string; ref: string }> = [];
    
    for (const filterRef of activeFilterIds) {
      // Split only on the first colon to handle IDs that contain colons
      const colonIndex = filterRef.indexOf(':');
      if (colonIndex === -1) continue;
      
      const filterId = filterRef.substring(0, colonIndex);
      const instanceId = filterRef.substring(colonIndex + 1);
      if (!filterId || !instanceId) continue;
      
      const key = `filter_identity:${filterId}:${instanceId}`;
      pipeline.get(key);
      filterRefs.push({ filterId, instanceId, ref: filterRef });
    }
    
    const results = await pipeline.exec();
    if (!results) return [];
    
    const identities: FilterIdentity[] = [];
    const inactiveFilters: string[] = [];
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const filterRef = filterRefs[i];
      if (!result || !filterRef) continue;
      
      const [error, identityData] = result;
      if (error || !identityData) continue;
      
      try {
        const identity: FilterIdentity = JSON.parse(identityData as string);
        
        // Check if filter is still active (last seen within 5 minutes)
        if (identity.lastSeen > fiveMinutesAgo) {
          identities.push(identity);
        } else {
          // Mark for removal from active set
          inactiveFilters.push(filterRef.ref);
        }
      } catch (parseError) {
        console.warn(`Failed to parse filter identity for ${filterRef.ref}:`, parseError);
        inactiveFilters.push(filterRef.ref);
      }
    }
    
    // Remove inactive filters in batch
    if (inactiveFilters.length > 0) {
      await redis.getClient().srem("active_filters", ...inactiveFilters);
    }

    return identities;
  }

  // Deregister filter
  static async deregisterFilter(filterId: string, instanceId: string): Promise<void> {
    const key = `filter_identity:${filterId}:${instanceId}`;
    await redis.delete(key);
    await redis.getClient().srem("active_filters", `${filterId}:${instanceId}`);
    
    console.log(`❌ Deregistered filter: ${filterId} (instance: ${instanceId})`);
  }

  // Create a signed message for publishing to Centrifugo
  static createSignedMessage(filterId: string, instanceId: string, data: any): any {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(8).toString('hex');
    
    const payload = {
      filterId,
      instanceId,
      timestamp,
      nonce,
      data
    };

    const messageString = JSON.stringify({ filterId, instanceId, timestamp, nonce, data });
    const signature = createHmac('sha256', this.FILTER_SECRET)
      .update(messageString)
      .digest('hex');

    return {
      ...payload,
      signature
    };
  }

  // Validate a signed message from the filter
  static async validateSignedMessage(message: any): Promise<{ valid: boolean; reason?: string; data?: any }> {
    try {
      const { filterId, instanceId, timestamp, nonce, signature, data } = message;

      // Check required fields
      if (!filterId || !instanceId || !timestamp || !nonce || !signature) {
        return { valid: false, reason: "Missing required fields" };
      }

      // Check timestamp with configurable validity window
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDiff = Math.abs(currentTime - timestamp);
      
      if (timeDiff > this.MESSAGE_VALIDITY_SECONDS) {
        return { valid: false, reason: "Message timestamp too old or too far in future" };
      }

      // Verify filter is registered and active
      const identity = await this.getFilterIdentity(filterId, instanceId);
      if (!identity || !identity.isActive) {
        return { valid: false, reason: "Filter not registered or inactive" };
      }

      // Verify signature
      const messageForSigning = JSON.stringify({ filterId, instanceId, timestamp, nonce, data });
      const expectedSignature = createHmac('sha256', this.FILTER_SECRET)
        .update(messageForSigning)
        .digest('hex');

      // Check signature format and length first
      if (signature.length !== expectedSignature.length) {
        return { valid: false, reason: "Invalid message signature" };
      }

      if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
        return { valid: false, reason: "Invalid message signature" };
      }

      // Atomically check and mark message nonce as used (prevent replay protection)
      const nonceKey = `msg_nonce:${filterId}:${nonce}`;
      const wasSet = await redis.getClient().set(
        nonceKey, 
        "used", 
        "EX", 
        300, // 5 minutes
        "NX"
      );
      
      if (!wasSet) {
        return { valid: false, reason: "Message nonce already used (replay attack)" };
      }

      // Update filter activity
      await this.updateFilterActivity(filterId, instanceId);

      return { valid: true, data };
    } catch (error) {
      console.error("Signed message validation error:", error);
      return { valid: false, reason: "Message validation error" };
    }
  }
}