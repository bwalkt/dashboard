import oauth2Plugin, { type OAuth2Namespace } from "@fastify/oauth2";
import type { AuthenticatedRequest, ErrorResponse, UserResponse } from "@pzero/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config/env.js";
import { redis } from "../config/redis.js";
import { authenticateToken } from "../middleware/auth.js";
import { authService } from "../services/auth.service.js";
import { userService } from "../services/user.service.js";

declare module "fastify" {
  interface FastifyInstance {
    githubOAuth2: OAuth2Namespace;
  }
}
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Register OAuth2 plugin
  await fastify.register(oauth2Plugin, {
    name: "githubOAuth2",
    redirectStateCookieName: "oauth_state",
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 3600, // 1 hour
    },
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
    callbackUri: (request: FastifyRequest) => {
      const clientType = request.headers["x-client-type"];
      if (clientType === "tauri") {
        return `${config.FRONTEND_URL}/auth/tauri-callback`;
      }

      return `${config.FRONTEND_URL}/auth/callback`;
    },
    scope: ["user:email"],
  });

  /**
   * GET /auth/login
   * Initiate GitHub OAuth flow
   */
  fastify.get("/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const githubOAuth2 = fastify.githubOAuth2;
      // Redirect to GitHub OAuth
      const authUrl = await githubOAuth2.generateAuthorizationUri(request, reply);

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
      if (!state) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid state parameter",
        } as ErrorResponse);
      }
      const storedState = request.cookies.oauth_state;
      if (!storedState || state !== storedState) {
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
      const tokenResponse = await fastify.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

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

      if (!user.github_id || !user.email) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid user data from GitHub",
        } as ErrorResponse);
      }
      // Generate JWT tokens
      const { accessToken, refreshToken } = authService.generateTokenPair(Number(user.id), user.github_id, user.email);
      reply.setCookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600, // 1 hour
      });
      reply.setCookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600 * 24 * 30, // 30 days
      });

      const randomInt1 = Math.floor(Math.random() * 1000000);
      const randomInt2 = Math.floor(Math.random() * 1000000);

      reply.header("X-Test-Eval", `${randomInt1} * ${randomInt2}`);
      await redis.set(`user:${user.id}:header`, `${randomInt1 * randomInt2}`, 3600);

      return reply.send({
        message: "Login successful",
        user,
      });
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
   * Refresh access token using refresh token from cookies
   */
  fastify.post("/auth/refresh", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Extract refresh token from cookies instead of request body
      const refreshToken = authService.extractRefreshTokenFromCookies(request.cookies);

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
      const user = userService.getUserById(Number(payload.userId));

      if (!user) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "User not found",
        } as ErrorResponse);
      }

      if (!user.github_id || !user.email) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid user data from GitHub",
        } as ErrorResponse);
      }
      // Generate new token pair
      const { accessToken, refreshToken: newRefreshToken } = authService.generateTokenPair(Number(user.id), user.github_id, user.email);

      // Set JWT tokens as cookies
      reply.setCookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600, // 1 hour
      });

      reply.setCookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600 * 24 * 30, // 30 days
      });

      const randomInt1 = Math.floor(Math.random() * 1000000);
      const randomInt2 = Math.floor(Math.random() * 1000000);

      reply.header("X-Test-Eval", `${randomInt1} * ${randomInt2}`);
      await redis.set(`user:${user.id}:header`, `${randomInt1 * randomInt2}`, 3600);

      return reply.send({
        accessToken,
        refreshToken: newRefreshToken,
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
        // Clear JWT cookies
        reply.clearCookie("accessToken", {
          path: "/",
        });

        reply.clearCookie("refreshToken", {
          path: "/",
        });

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
