import { uuid } from '@pzero/shared/uuid';
import { redis } from '../config/redis.js';

// Get the underlying Redis client for advanced operations
const redisClient = redis.getClient();

interface SessionData {
  uid: string;
  email: string;
  name: string;
  c_at: number;
  last_seen: number;
  data: {
    meta: {
      source: string;
      ip?: string;
      user_agent?: string;
    };
  };
}

interface CreateSessionRequest {
  userId: string;
  email: string;
  name: string;
  ip?: string;
  userAgent?: string;
  isActive?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

interface UserRecord {
  email: string;
  uid: string;
  sids: string[]; // Array of session IDs
  is_act: boolean; // Is active
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export class SessionService {
  private static readonly SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

  /**
   * Create or update user record
   */
  private static async upsertUserRecord(request: CreateSessionRequest, sessionId: string): Promise<void> {
    const userKey = `users:${request.userId}`;
    
    // Get existing user record if it exists
    const existingRecord = await this.getUserRecord(request.userId);
    
    let sids: string[] = [];
    if (existingRecord) {
      // Add to existing sessions
      sids = [...existingRecord.sids, sessionId];
    } else {
      // First session for this user
      sids = [sessionId];
    }

    const userRecord: UserRecord = {
      email: request.email,
      uid: request.userId,
      sids,
      is_act: request.isActive ?? true,
      status: request.status ?? 'ACTIVE'
    };

    // Store user record
    await redisClient.hset(userKey,
      'email', userRecord.email,
      'uid', userRecord.uid,
      'sids', JSON.stringify(userRecord.sids),
      'is_act', userRecord.is_act.toString(),
      'status', userRecord.status
    );

    // Set TTL for user record
    await redisClient.expire(userKey, this.SESSION_TTL);
  }

  /**
   * Get user record
   */
  static async getUserRecord(userId: string): Promise<UserRecord | null> {
    const userKey = `users:${userId}`;
    const userHash = await redisClient.hgetall(userKey);

    if (!userHash || Object.keys(userHash).length === 0) {
      return null;
    }

    // Validate that all required fields exist
    if (!userHash.email || !userHash.uid || !userHash.sids || 
        !userHash.is_act || !userHash.status) {
      return null;
    }

    return {
      email: userHash.email,
      uid: userHash.uid,
      sids: JSON.parse(userHash.sids),
      is_act: userHash.is_act === 'true',
      status: userHash.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
    };
  }

  /**
   * Create a new session for the user
   */
  static async createSession(request: CreateSessionRequest): Promise<string> {
    const sessionId = uuid();
    const now = Date.now();

    const sessionData: SessionData = {
      uid: request.userId,
      email: request.email,
      name: request.name,
      c_at: now,
      last_seen: now,
      data: {
        meta: {
          source: 'wasm_filter',
          ip: request.ip || 'unknown',
          user_agent: request.userAgent || 'unknown',
        },
      },
    };

    // Store session data
    const sessionKey = `filter:sessions:data:${sessionId}`;
    await redisClient.hset(sessionKey,
      'uid', sessionData.uid,
      'email', sessionData.email,
      'name', sessionData.name,
      'c_at', sessionData.c_at.toString(),
      'last_seen', sessionData.last_seen.toString(),
      'data', JSON.stringify(sessionData.data)
    );
    await redisClient.expire(sessionKey, this.SESSION_TTL);

    // Add to user's session set
    const userSessionKey = `filter:sessions:user:${request.userId}`;
    await redisClient.sadd(userSessionKey, sessionId);
    await redisClient.expire(userSessionKey, this.SESSION_TTL);

    // Add to active sessions hash
    await redisClient.hset('filter:sessions:active', sessionId, JSON.stringify({
      uid: request.userId,
      email: request.email,
      c_at: now,
    }));

    // Create or update user record with session
    await this.upsertUserRecord(request, sessionId);

    return sessionId;
  }

  /**
   * Update session last_seen timestamp
   */
  static async updateSessionLastSeen(sessionId: string): Promise<void> {
    const sessionKey = `filter:sessions:data:${sessionId}`;
    const now = Date.now();

    await redisClient.hset(sessionKey, 'last_seen', now.toString());
  }

  /**
   * Delete session
   */
  static async deleteSession(sessionId: string, userId: string): Promise<void> {
    // Remove from session data
    const sessionKey = `filter:sessions:data:${sessionId}`;
    await redisClient.del(sessionKey);

    // Remove from user's session set
    const userSessionKey = `filter:sessions:user:${userId}`;
    await redisClient.srem(userSessionKey, sessionId);

    // Remove from active sessions
    await redisClient.hdel('filter:sessions:active', sessionId);

    // Update user record to remove session ID
    await this.removeSessionFromUserRecord(userId, sessionId);
  }

  /**
   * Remove session from user record
   */
  private static async removeSessionFromUserRecord(userId: string, sessionId: string): Promise<void> {
    const userRecord = await this.getUserRecord(userId);
    if (userRecord) {
      // Remove session ID from sids array
      userRecord.sids = userRecord.sids.filter(sid => sid !== sessionId);
      
      const userKey = `users:${userId}`;
      await redisClient.hset(userKey, 'sids', JSON.stringify(userRecord.sids));
      
      // If no sessions left, optionally set is_act to false
      if (userRecord.sids.length === 0) {
        await redisClient.hset(userKey, 'is_act', 'false');
      }
    }
  }

  /**
   * Get session data
   */
  static async getSession(sessionId: string): Promise<SessionData | null> {
    const sessionKey = `filter:sessions:data:${sessionId}`;
    const sessionHash = await redisClient.hgetall(sessionKey);

    if (!sessionHash || Object.keys(sessionHash).length === 0) {
      return null;
    }

    // Validate that all required fields exist
    if (!sessionHash.uid || !sessionHash.email || !sessionHash.name || 
        !sessionHash.c_at || !sessionHash.last_seen || !sessionHash.data) {
      return null;
    }

    return {
      uid: sessionHash.uid,
      email: sessionHash.email,
      name: sessionHash.name,
      c_at: parseInt(sessionHash.c_at, 10),
      last_seen: parseInt(sessionHash.last_seen, 10),
      data: JSON.parse(sessionHash.data),
    };
  }

  /**
   * Delete all sessions for a user
   */
  static async deleteUserSessions(userId: string): Promise<void> {
    const userSessionKey = `filter:sessions:user:${userId}`;
    const sessionIds = await redisClient.smembers(userSessionKey);

    if (sessionIds.length > 0) {
      // Delete each session
      const pipeline = redisClient.pipeline();
      for (const sessionId of sessionIds) {
        pipeline.del(`filter:sessions:data:${sessionId}`);
        pipeline.hdel('filter:sessions:active', sessionId);
      }
      pipeline.del(userSessionKey);
      await pipeline.exec();
    }

    // Clear user record sessions and set as inactive
    const userKey = `users:${userId}`;
    await redisClient.hset(userKey, 
      'sids', JSON.stringify([]),
      'is_act', 'false'
    );
  }
}