import { uuid } from "@pzero/shared/uuid";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../config/database.js";
import { redis } from "../config/redis.js";
import { filterRedisService } from "../services/filter-redis.service.js";
import { userService } from "../services/user.service.js";

// Redis keys for session management
const SESSION_KEYS = {
  ACTIVE_SESSIONS: "filter:sessions:active",      // Hash of active user sessions
  SESSION_DATA: "filter:sessions:data:",          // Hash with sessionId suffix
  USER_SESSIONS: "filter:sessions:user:",         // Set with userId suffix
  NEXT_FUNCS: "filter:sessions:next_funcs:",      // Hash with sessionId suffix
};

// Get session TTL from environment variable (in days), default to 30 days
const getSessionTTL = (): number => {
  const ttlDays = process.env.SESSION_TTL_DAYS ? parseInt(process.env.SESSION_TTL_DAYS, 10) : 30;
  return ttlDays * 24 * 60 * 60; // Convert days to seconds
};

interface SessionUpdateRequest {
  email: string;
  sid?: string;
  metadata?: Record<string, any>;
}

interface SessionUpdateResponse {
  success: boolean;
  sid: string;
  uid?: string;
  nextFuncs?: Record<string, any>;
  message?: string;
}

export async function filterSessionRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /filter/session/update
   * Update Redis session data when user logs in
   * This endpoint is called by the WASM filter when it intercepts a login
   */
  fastify.post(
    "/filter/session/update",
    async (
      request: FastifyRequest<{ Body: SessionUpdateRequest }>,
      reply: FastifyReply
    ): Promise<SessionUpdateResponse> => {
      try {
        const { email, sid, metadata } = request.body;

        if (!email) {
          return reply.status(400).send({
            success: false,
            sid: "",
            message: "Email is required",
          });
        }

        // Look up user by email using user service
        const user = await userService.getUserByEmail(email);

        if (!user) {
          return reply.status(404).send({
            success: false,
            sid: sid || "",
            message: "User not found",
          });
        }

        const userId = user.id;
        // Generate UUID v7 if no sid provided
        const finalSessionId = sid || uuid();

        // Get next_funcs for the user from all_auth table
        const authResult = await db.query(
          `SELECT next_funcs 
           FROM pzero.all_auth 
           WHERE user_id = $1 
           LIMIT 1`,
          [userId]
        );

        const nextFuncs = authResult.rows.length > 0 
          ? authResult.rows[0].next_funcs 
          : {};

        // Store session data in Redis
        const sessionData = {
          uid: userId,
          email: user.email,
          name: user.name, // Use name instead of handle (handle not available in UserWithStatus)
          sid: finalSessionId,
          c_at: Date.now(),
          last_seen: Date.now(),
          data: metadata || { meta: { source: 'wasm_filter' } },
        };

        // Update multiple Redis keys atomically using pipeline
        const pipeline = redis.getClient().pipeline();
        const sessionTTL = getSessionTTL();

        // 1. Store session data with TTL
        pipeline.hset(
          SESSION_KEYS.SESSION_DATA + finalSessionId,
          Object.entries(sessionData).map(([k, v]) => [k, JSON.stringify(v)]).flat()
        );
        pipeline.expire(SESSION_KEYS.SESSION_DATA + finalSessionId, sessionTTL);

        // 2. Add to active sessions with TTL
        pipeline.hset(
          SESSION_KEYS.ACTIVE_SESSIONS,
          finalSessionId,
          JSON.stringify({
            uid: userId,
            email: user.email,
            c_at: Date.now(),
          })
        );
        // Set TTL on the entire hash (will be refreshed on each session creation)
        pipeline.expire(SESSION_KEYS.ACTIVE_SESSIONS, sessionTTL);

        // 3. Add to user's session set with TTL
        pipeline.sadd(SESSION_KEYS.USER_SESSIONS + userId, finalSessionId);
        pipeline.expire(SESSION_KEYS.USER_SESSIONS + userId, sessionTTL);

        // 4. Store next_funcs if available with TTL
        if (nextFuncs && Object.keys(nextFuncs).length > 0) {
          pipeline.hset(
            SESSION_KEYS.NEXT_FUNCS + finalSessionId,
            Object.entries(nextFuncs).map(([k, v]) => [k, JSON.stringify(v)]).flat()
          );
          pipeline.expire(SESSION_KEYS.NEXT_FUNCS + finalSessionId, sessionTTL);
        }

        await pipeline.exec();

        // Update filter header info to include this session
        const headerInfo = await filterRedisService.getHeaderInfo();

        await filterRedisService.updateHeaderInfo('users', {
          ...headerInfo.active_users,
          [userId]: {
            email: user.email,
            name: user.name, // Use name instead of handle
            sid: finalSessionId,
            last_seen: Date.now(),
          }
        });

        if (nextFuncs && Object.keys(nextFuncs).length > 0) {
          await filterRedisService.updateHeaderInfo('functions', {
            ...headerInfo.next_functions,
            [finalSessionId]: nextFuncs,
          });
        }

        console.log(`✅ Session updated for user ${userId} (${email}): ${finalSessionId}`);

        return reply.send({
          success: true,
          sid: finalSessionId,
          uid: userId,
          nextFuncs,
        });
      } catch (error) {
        console.error("Session update error:", error);
        return reply.status(500).send({
          success: false,
          sessionId: "",
          message: "Failed to update session",
        });
      }
    }
  );

  /**
   * GET /filter/session/check/:sessionId
   * Check if a session exists and get its data
   */
  fastify.get(
    "/filter/session/check/:sessionId",
    async (
      request: FastifyRequest<{ Params: { sessionId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { sessionId } = request.params;

        // Check if session exists
        const sessionData = await redis.getClient().hgetall(
          SESSION_KEYS.SESSION_DATA + sessionId
        );

        if (!sessionData || Object.keys(sessionData).length === 0) {
          return reply.status(404).send({
            success: false,
            message: "Session not found",
          });
        }

        // Get next_funcs for this session
        const nextFuncs = await redis.getClient().hgetall(
          SESSION_KEYS.NEXT_FUNCS + sessionId
        );

        // Parse stored JSON values
        const parsedSessionData: Record<string, any> = {};
        for (const [key, value] of Object.entries(sessionData)) {
          try {
            parsedSessionData[key] = JSON.parse(value);
          } catch (err) {
            console.warn(`Failed to parse session data field '${key}' for session ${sessionId}:`, err);
            parsedSessionData[key] = value;
          }
        }

        const parsedNextFuncs: Record<string, any> = {};
        for (const [key, value] of Object.entries(nextFuncs)) {
          try {
            parsedNextFuncs[key] = JSON.parse(value);
          } catch (err) {
            console.warn(`Failed to parse next_funcs field '${key}' for session ${sessionId}:`, err);
            parsedNextFuncs[key] = value;
          }
        }

        // Update last seen
        await redis.getClient().hset(
          SESSION_KEYS.SESSION_DATA + sessionId,
          "last_seen",
          JSON.stringify(Date.now())
        );

        return reply.send({
          success: true,
          session: parsedSessionData,
          nextFuncs: parsedNextFuncs,
        });
      } catch (error) {
        console.error("Session check error:", error);
        return reply.status(500).send({
          success: false,
          message: "Failed to check session",
        });
      }
    }
  );

  /**
   * DELETE /filter/session/:sessionId
   * Remove a session (for logout)
   */
  fastify.delete(
    "/filter/session/:sessionId",
    async (
      request: FastifyRequest<{ Params: { sessionId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { sessionId } = request.params;

        // Get session data to find uid
        const sessionData = await redis.getClient().hget(
          SESSION_KEYS.SESSION_DATA + sessionId,
          "uid"
        );

        // Use pipeline for atomic deletions
        const pipeline = redis.getClient().pipeline();
        let userId: string | undefined;

        if (sessionData) {
          try {
            userId = JSON.parse(sessionData);
            
            // Remove from user's session set
            pipeline.srem(SESSION_KEYS.USER_SESSIONS + userId, sessionId);
          } catch (err) {
            console.warn(`Failed to parse uid from session ${sessionId}:`, err);
            // Continue with deletion of other keys even if uid parse fails
          }
        }

        // Remove session data and next_funcs atomically
        pipeline.del(
          SESSION_KEYS.SESSION_DATA + sessionId,
          SESSION_KEYS.NEXT_FUNCS + sessionId
        );

        // Remove from active sessions
        pipeline.hdel(SESSION_KEYS.ACTIVE_SESSIONS, sessionId);

        // Execute all deletions atomically
        await pipeline.exec();

        // Clean up header info if we have userId
        if (userId) {
          try {
            const headerInfo = await filterRedisService.getHeaderInfo();
            
            // Remove user from header info (if this was their only session)
            const updatedUsers = { ...headerInfo.active_users };
            delete updatedUsers[userId];
            await filterRedisService.updateHeaderInfo('users', updatedUsers);
            
            // Remove functions from header info
            const updatedFunctions = { ...headerInfo.next_functions };
            delete updatedFunctions[sessionId];
            await filterRedisService.updateHeaderInfo('functions', updatedFunctions);
          } catch (err) {
            console.warn(`Failed to clean up header info for session ${sessionId}:`, err);
          }
        }

        console.log(`✅ Session removed: ${sessionId}`);

        return reply.send({
          success: true,
          message: "Session removed successfully",
        });
      } catch (error) {
        console.error("Session removal error:", error);
        return reply.status(500).send({
          success: false,
          message: "Failed to remove session",
        });
      }
    }
  );
}