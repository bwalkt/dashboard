import { uuid } from "@pzero/shared/uuid";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../config/database.js";
import { redis } from "../config/redis.js";
import { filterRedisService } from "../services/filter-redis.service.js";

// Redis keys for session management
const SESSION_KEYS = {
  ACTIVE_SESSIONS: "filter:sessions:active",      // Hash of active user sessions
  SESSION_DATA: "filter:sessions:data:",          // Hash with sessionId suffix
  USER_SESSIONS: "filter:sessions:user:",         // Set with userId suffix
  NEXT_FUNCS: "filter:sessions:next_funcs:",      // Hash with sessionId suffix
};

interface SessionUpdateRequest {
  email: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

interface SessionUpdateResponse {
  success: boolean;
  sessionId: string;
  userId?: string;
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
        const { email, sessionId, metadata } = request.body;

        if (!email) {
          return reply.status(400).send({
            success: false,
            sessionId: "",
            message: "Email is required",
          });
        }

        // Look up user by email in PostgreSQL
        const userResult = await db.query(
          `SELECT user_id, email, handle 
           FROM pzero.all_users 
           WHERE email = $1 
           LIMIT 1`,
          [email]
        );

        if (userResult.rows.length === 0) {
          return reply.status(404).send({
            success: false,
            sessionId: sessionId || "",
            message: "User not found",
          });
        }

        const user = userResult.rows[0];
        const userId = user.user_id;
        // Generate UUID v7 if no sessionId provided
        const finalSessionId = sessionId || uuid();

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
          userId,
          email: user.email,
          handle: user.handle,
          sessionId: finalSessionId,
          createdAt: Date.now(),
          lastActivity: Date.now(),
          ...metadata,
        };

        // Update multiple Redis keys atomically using pipeline
        const pipeline = redis.getClient().pipeline();

        // 1. Store session data (no TTL)
        pipeline.hset(
          SESSION_KEYS.SESSION_DATA + finalSessionId,
          Object.entries(sessionData).map(([k, v]) => [k, JSON.stringify(v)]).flat()
        );

        // 2. Add to active sessions
        pipeline.hset(
          SESSION_KEYS.ACTIVE_SESSIONS,
          finalSessionId,
          JSON.stringify({
            userId,
            email: user.email,
            createdAt: Date.now(),
          })
        );

        // 3. Add to user's session set
        pipeline.sadd(SESSION_KEYS.USER_SESSIONS + userId, finalSessionId);

        // 4. Store next_funcs if available
        if (nextFuncs && Object.keys(nextFuncs).length > 0) {
          pipeline.hset(
            SESSION_KEYS.NEXT_FUNCS + finalSessionId,
            Object.entries(nextFuncs).map(([k, v]) => [k, JSON.stringify(v)]).flat()
          );
        }

        await pipeline.exec();

        // Update filter header info to include this session
        await filterRedisService.updateHeaderInfo('users', {
          ...await filterRedisService.getHeaderInfo().then(info => info.active_users),
          [userId]: {
            email: user.email,
            handle: user.handle,
            sessionId: finalSessionId,
            lastActivity: Date.now(),
          }
        });

        if (nextFuncs && Object.keys(nextFuncs).length > 0) {
          await filterRedisService.updateHeaderInfo('functions', {
            ...await filterRedisService.getHeaderInfo().then(info => info.next_functions),
            [finalSessionId]: nextFuncs,
          });
        }

        console.log(`✅ Session updated for user ${userId} (${email}): ${finalSessionId}`);

        return reply.send({
          success: true,
          sessionId: finalSessionId,
          userId,
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
          } catch {
            parsedSessionData[key] = value;
          }
        }

        const parsedNextFuncs: Record<string, any> = {};
        for (const [key, value] of Object.entries(nextFuncs)) {
          try {
            parsedNextFuncs[key] = JSON.parse(value);
          } catch {
            parsedNextFuncs[key] = value;
          }
        }

        // Update last activity
        await redis.getClient().hset(
          SESSION_KEYS.SESSION_DATA + sessionId,
          "lastActivity",
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

        // Get session data to find userId
        const sessionData = await redis.getClient().hget(
          SESSION_KEYS.SESSION_DATA + sessionId,
          "userId"
        );

        if (sessionData) {
          let userId: string | undefined;
          try {
            userId = JSON.parse(sessionData);
          } catch (err) {
            console.warn(`Failed to parse userId from session ${sessionId}:`, err);
            // Continue with deletion of other keys even if userId parse fails
          }
          
          if (userId) {
            // Remove from user's session set
            await redis.getClient().srem(
              SESSION_KEYS.USER_SESSIONS + userId,
              sessionId
            );
          }
        }

        // Remove session data and next_funcs
        await redis.getClient().del(
          SESSION_KEYS.SESSION_DATA + sessionId,
          SESSION_KEYS.NEXT_FUNCS + sessionId
        );

        // Remove from active sessions
        await redis.getClient().hdel(
          SESSION_KEYS.ACTIVE_SESSIONS,
          sessionId
        );

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