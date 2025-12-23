import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { config } from "../config/env.js";
import { redis } from "../config/redis.js";

export interface FilterAuthToken {
  filterId: string;
  signature: string;
  timestamp: number;
  nonce: string;
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
  private static readonly TOKEN_VALIDITY_SECONDS = 300; // 5 minutes
  private static readonly NONCE_CACHE_TTL = 600; // 10 minutes (longer than token validity)
  private static readonly MAX_CLOCK_SKEW = 30; // 30 seconds

  // Generate a secure authentication token for the filter
  static generateAuthToken(filterId: string, envoyNodeId?: string): FilterAuthToken {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(16).toString('hex');
    
    const message = `${filterId}:${timestamp}:${nonce}:${envoyNodeId || ''}`;
    const signature = createHmac('sha256', this.FILTER_SECRET)
      .update(message)
      .digest('hex');

    return {
      filterId,
      signature,
      timestamp,
      nonce
    };
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

      // Check if nonce was already used (prevent replay attacks)
      const nonceKey = `filter_nonce:${nonce}`;
      const nonceExists = await redis.exists(nonceKey);
      
      if (nonceExists) {
        return { valid: false, reason: "Token already used (nonce replay)" };
      }

      // Validate signature
      const expectedMessage = `${filterId}:${timestamp}:${nonce}:`;
      const expectedSignature = createHmac('sha256', this.FILTER_SECRET)
        .update(expectedMessage)
        .digest('hex');

      if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
        return { valid: false, reason: "Invalid signature" };
      }

      // Mark nonce as used
      await redis.set(nonceKey, "used", this.NONCE_CACHE_TTL);

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

  // Get all active filters
  static async getActiveFilters(): Promise<FilterIdentity[]> {
    const activeFilterIds = await redis.getClient().smembers("active_filters");
    const identities: FilterIdentity[] = [];

    for (const filterRef of activeFilterIds) {
      const [filterId, instanceId] = filterRef.split(':');
      const identity = await this.getFilterIdentity(filterId, instanceId);
      
      if (identity) {
        // Check if filter is still active (last seen within 5 minutes)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        if (identity.lastSeen > fiveMinutesAgo) {
          identities.push(identity);
        } else {
          // Remove inactive filter
          await redis.getClient().srem("active_filters", filterRef);
          identity.isActive = false;
        }
      }
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

      // Check timestamp (allow 2 minute clock skew)
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDiff = Math.abs(currentTime - timestamp);
      
      if (timeDiff > 120) {
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

      if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
        return { valid: false, reason: "Invalid message signature" };
      }

      // Check nonce for replay protection
      const nonceKey = `msg_nonce:${filterId}:${nonce}`;
      const nonceExists = await redis.exists(nonceKey);
      
      if (nonceExists) {
        return { valid: false, reason: "Message nonce already used (replay attack)" };
      }

      // Mark nonce as used (with shorter TTL for message nonces)
      await redis.set(nonceKey, "used", 300); // 5 minutes

      // Update filter activity
      await this.updateFilterActivity(filterId, instanceId);

      return { valid: true, data };
    } catch (error) {
      console.error("Signed message validation error:", error);
      return { valid: false, reason: "Message validation error" };
    }
  }
}

// Export singleton instance  
export const filterAuthService = new FilterAuthService();