import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authService } from "../services/auth.service.js";
import { userService } from "../services/user.service.js";
import { authenticateToken } from "../middleware/auth.js";
import type { AuthenticatedRequest, AuthResponse, UserResponse, ErrorResponse } from "@dashboard/shared-types";
import oauth2Plugin, { type OAuth2Namespace } from "@fastify/oauth2";

declare module "fastify" {
  interface FastifyInstance {
    githubOAuth2: OAuth2Namespace;
  }
}
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Register OAuth2 plugin
  await fastify.register(oauth2Plugin, {
    name: "githubOAuth2",
    credentials: {
      client: {
        id: process.env.GITHUB_CLIENT_ID!,
        secret: process.env.GITHUB_CLIENT_SECRET!,
      },
      auth: {
        authorizeHost: "https://github.com",
        authorizePath: "/login/oauth/authorize",
        tokenHost: "https://github.com",
        tokenPath: "/login/oauth/access_token",
      },
    },
    callbackUri: process.env.CALLBACK_URL || "http://localhost:1420/auth/callback",
    scope: ["user:email"],
  });

  /**
   * GET /auth/login
   * Initiate GitHub OAuth flow
   */
  fastify.get("/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Generate state parameter for CSRF protection
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // Store state in session or cookie for validation
      // For simplicity, we'll use a cookie
      reply.setCookie("oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600000, // 10 minutes
      });

      const githuboAuth2 = fastify.githubOAuth2;
      // Redirect to GitHub OAuth
      const authUrl = await githuboAuth2.generateAuthorizationUri(request, reply);

      return reply.code(200).send({ authUrl });
    } catch (error) {
      console.error("Login initiation error:", error);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Failed to initiate OAuth flow",
      } as ErrorResponse);
    }
  });

  /**
   * GET /auth/callback
   * Handle OAuth callback from GitHub
   */
  fastify.get("/auth/callback", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { code, state } = request.query as { code: string; state: string };

      // Validate state parameter
      const storedState = request.cookies.oauth_state;
      if (!state || !storedState || state !== storedState) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid state parameter",
        } as ErrorResponse);
      }

      // Clear state cookie
      reply.clearCookie("oauth_state");

      if (!code) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Authorization code missing",
        } as ErrorResponse);
      }

      // Exchange code for access token
      const tokenResponse = await (fastify as any).githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      if (!tokenResponse.token.access_token) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Failed to obtain access token",
        } as ErrorResponse);
      }

      // Fetch user profile from GitHub
      const githubUserResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenResponse.token.access_token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Dashboard-App",
        },
      });

      if (!githubUserResponse.ok) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Failed to fetch user profile from GitHub",
        } as ErrorResponse);
      }

      const githubUserData = await githubUserResponse.json();
      const githubUser = userService.validateGitHubUser(githubUserData);

      if (!githubUser) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid user data from GitHub",
        } as ErrorResponse);
      }

      // Create or update user in database
      const user = userService.upsertUserFromGitHub(githubUser);

      // Generate JWT tokens
      const { accessToken, refreshToken } = authService.generateTokenPair(user.id, user.github_id, user.email);

      // Return tokens and user info
      const response: AuthResponse = {
        accessToken,
        refreshToken,
        user,
      };

      return reply.send(response);
    } catch (error) {
      console.error("OAuth callback error:", error);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "OAuth callback failed",
      } as ErrorResponse);
    }
  });

  /**
   * GET /auth/me
   * Get current user info (protected route)
   */
  fastify.get(
    "/auth/me",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const response: UserResponse = {
          user: (request as unknown as AuthenticatedRequest).user,
        };

        return reply.send(response);
      } catch (error) {
        console.error("Get user info error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get user information",
        } as ErrorResponse);
      }
    }
  );

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  fastify.post("/auth/refresh", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken } = request.body as { refreshToken: string };

      if (!refreshToken) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Refresh token is required",
        } as ErrorResponse);
      }

      const payload = authService.verifyRefreshToken(refreshToken);

      if (!payload) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Invalid or expired refresh token",
        } as ErrorResponse);
      }

      // Get user from database
      const user = userService.getUserById(payload.userId);

      if (!user) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "User not found",
        } as ErrorResponse);
      }

      // Generate new access token
      const { accessToken } = authService.generateTokenPair(user.id, user.github_id, user.email);

      return reply.send({
        accessToken,
        user,
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Token refresh failed",
      } as ErrorResponse);
    }
  });

  /**
   * POST /auth/logout
   * Logout user (invalidate tokens)
   */
  fastify.post(
    "/auth/logout",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // In a production app, you might want to blacklist the token
        // For now, we'll just return a success message
        return reply.send({
          message: "Logged out successfully",
        });
      } catch (error) {
        console.error("Logout error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Logout failed",
        } as ErrorResponse);
      }
    }
  );
}
