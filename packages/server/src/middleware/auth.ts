import type { AuthenticatedRequest } from "@pzero/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config/env.js";
import { authService } from "../services/auth.service.js";
import { userService } from "../services/user.service.js";

/**
 * Verify trusted internal header from Envoy filter
 * Uses a shared secret to validate internal requests
 */
function isTrustedInternalRequest(request: FastifyRequest): boolean {
  const internalHeader = request.headers["x-internal-auth-secret"] as string | undefined;
  const internalSecret = config.ENVOY_INTERNAL_SECRET || config.JWT_SECRET; // Fallback to JWT_SECRET if not set

  if (!internalHeader || !internalSecret) {
    return false;
  }

  // Simple constant-time comparison (in production, use crypto.timingSafeEqual)
  // For now, basic comparison is acceptable since this is an internal network check
  return internalHeader === internalSecret;
}

/**
 * JWT Authentication middleware
 * Extracts and verifies JWT token from Authorization header or cookies
 * Attaches user info to request object
 *
 * For trusted internal requests (from Envoy filter), uses email from header
 * and skips JWT verification entirely
 */
export async function authenticateToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Debug logs only in development environment
    if (config.NODE_ENV === "development") {
      console.log("Auth middleware - processing authentication request");
      console.log("headers", request.headers);
    }

    // Check if this is a trusted internal request from Envoy filter
    const isInternal = isTrustedInternalRequest(request);
    let userEmail: string | null = null;

    if (isInternal) {
      // For internal requests, get email directly from header
      // Envoy has already decoded and validated the JWT
      userEmail = (request.headers["x-internal-user-email"] as string | undefined) || null;

      if (config.NODE_ENV === "development") {
        console.log("Trusted internal request - using email from header:", userEmail);
      }

      if (!userEmail) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Missing user email in internal request",
        });
      }

      // Validate email format (basic check)
      if (!userEmail.includes("@") || userEmail.length < 3) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Invalid email format in internal request",
        });
      }
    } else {
      // For external requests, extract and verify JWT token normally
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

      userEmail = payload.email;
    }

    if (!userEmail) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "User email not found",
      });
    }

    // Get user from database
    const user = await userService.getUserByEmail(userEmail);

    if (!user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "User not found",
      });
    }
    // Clean up user object by removing derived fields before attaching to request
    // @ts-ignore
    if (user.is_del || !user.is_act) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "User is deleted or inactive",
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
