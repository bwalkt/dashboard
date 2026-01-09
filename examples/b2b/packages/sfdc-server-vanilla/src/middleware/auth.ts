import type { AuthenticatedRequest, ErrorResponse } from "@pzero/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { authService } from "../services/auth.service.js";

import { userService } from "../services/user.service.js";

/**
 * JWT Authentication middleware
 * Extracts and verifies JWT token from Authorization header or cookies
 * Attaches user info to request object
 */
export async function authenticateToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    const headerToken = authService.extractTokenFromHeader(authHeader);
    const cookieToken = authService.extractTokenFromCookies(request.cookies);

    // Try header token first, then cookie token
    const token = headerToken || cookieToken;

    if (!token) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Authorization header or access token cookie missing",
      });
    }

    const payload = authService.verifyAccessToken(token);

    if (!payload) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
    }

    // Validate userId is present
    console.log("[SFDC Auth] Token payload:", JSON.stringify(payload));

    // Try to get user by ID first (for local users)
    let user = null;
    const userId = Number(payload.userId);

    if (Number.isFinite(userId) && Number.isInteger(userId) && userId > 0) {
      console.log("[SFDC Auth] Looking up user by ID:", userId);
      user = userService.getUserById(userId);
    }

    // If not found by ID and we have GitHub info, try GitHub lookup/creation
    if (!user && payload.githubId && payload.email) {
      console.log("[SFDC Auth] User not found by ID, trying GitHub lookup:", payload.githubId);
      user = userService.getUserByGithubId(payload.githubId);
      if (!user) {
        console.log("[SFDC Auth] Creating new user from GitHub info");
        // Create user from JWT payload
        const login = payload.email.split("@")[0] || "user";
        user = userService.upsertUserFromGitHub({
          id: payload.githubId,
          login: login,
          name: login,
          email: payload.email,
          avatar_url: "",
        });
        console.log("[SFDC Auth] Created user:", user ? user.id : "failed");
      }
    }

    if (!user) {
      console.log("[SFDC Auth] User not found after all attempts");
      return reply.status(401).send({
        error: "Unauthorized",
        message: "User not found",
      });
    }
    (request as unknown as AuthenticatedRequest).user = user;
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "Authentication failed",
    });
  }
}
