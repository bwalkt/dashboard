import type { AuthenticatedRequest } from "@pzero/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config/env.js";
import { authService } from "../services/auth.service.js";
import { userService } from "../services/user.service.js";

/**
 * JWT Authentication middleware
 * Extracts and verifies JWT token from Authorization header or cookies
 * Attaches user info to request object
 */
export async function authenticateToken(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    // Debug logs only in development environment
    if (config.NODE_ENV === "development") {
      console.log("Auth middleware - processing authentication request");
    }

    const authHeader = request.headers.authorization;
    const customAuthHeader = request.headers["x-custom-auth"] as string | undefined;
    const headerToken = authService.extractTokenFromHeader(authHeader);
    const cookieToken = authService.extractTokenFromCookies(request.cookies);

    // Try custom auth header first, then Authorization header, then cookie token
    const token = customAuthHeader || headerToken || cookieToken;

    if (!token) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Authorization header or access token cookie missing",
      });
    }

    const payload = authService.verifyAccessToken(token);

    if (config.NODE_ENV === "development") {
      console.log("Token verification successful for user:", payload?.userId);
    }

    if (!payload) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
    }

    // Get user from database
    const user = await userService.getUserById(payload.userId);

    if (!user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "User not found",
      });
    }
    // Attach user to request
    (request as unknown as AuthenticatedRequest).user = user;
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "Authentication failed",
    });
  }
}
