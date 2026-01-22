import { randomInt } from "node:crypto";
import type { AuthenticatedRequest } from "@pzero/shared";
import { CHALLENGE_ID_HEADER, CHALLENGE_PARAMS_HEADER, CHALLENGE_QUESTION_HEADER } from "@pzero/shared/challenge";
import { genFunctionAsJson } from "@pzero/shared/grid";
import { uuid } from "@pzero/shared/uuid";
import type { FastifyReply, FastifyRequest } from "fastify";
import { redis } from "../config/redis.js";
import { userService } from "../services/user.service.js";
import { encryptionService } from "../utils/encryption.js";

/**
 * Middleware to add challenge headers to authenticated responses
 * This ensures each response includes a new challenge for the next request
 */
export async function addChallengeHeaders(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Only add challenges for authenticated requests
    const authenticatedRequest = request as unknown as AuthenticatedRequest;
    const user = authenticatedRequest.user;
    
    if (!user || !user.id) {
      return;
    }

    // Get user's grid from database
    const userWithGrid = await userService.getUserByEmail(user.email);
    
    if (!userWithGrid?.data?.grid) {
      console.warn("No grid found for user:", user.id);
      return;
    }

    // Decrypt the grid
    const grid = encryptionService.decrypt(userWithGrid.data.grid);
    
    // Generate new challenge
    const challengeId = uuid();
    const complexity = randomInt(1, 4);
    const challengeData = genFunctionAsJson(grid, complexity);
    const challengeKey = `challenge:${challengeId}`;
    
    // Store challenge in Redis
    const challengePayload = {
      answer: challengeData.result.value,
      uid: user.id,
      used: false,
      c_at: new Date().toISOString()
    };
    
    // Set challenge with 5 minute expiry
    await redis.set(challengeKey, JSON.stringify(challengePayload), 300);
    
    // Add challenge headers to response
    reply.header(CHALLENGE_ID_HEADER, challengeId);
    reply.header(CHALLENGE_QUESTION_HEADER, challengeData.function.expression);
    reply.header(CHALLENGE_PARAMS_HEADER, `x=${challengeData.parameters.x},y=${challengeData.parameters.y}`);
    
    console.log(`[Challenge Middleware] Generated new challenge:`, {
      challengeId,
      question: challengeData.function.expression,
      userId: user.id,
      endpoint: request.url
    });
  } catch (error) {
    console.error("Error adding challenge headers:", error);
    // Don't fail the request if challenge generation fails
  }
}

/**
 * Hook to add challenge headers after handler completes
 * This should be added to all authenticated routes
 */
export async function onSendHook(
  request: FastifyRequest,
  reply: FastifyReply,
  payload: unknown
): Promise<unknown> {
  // Only add challenge headers for successful responses
  if (reply.statusCode >= 200 && reply.statusCode < 300) {
    await addChallengeHeaders(request, reply);
  }
  return payload;
}
