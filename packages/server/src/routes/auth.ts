import oauth2Plugin, { type OAuth2Namespace } from "@fastify/oauth2";
import type {
  AuthenticatedRequest,
  ErrorResponse,
  UserResponse,
} from "@pzero/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config/env";
import { redis } from "../config/redis";
import { authenticateToken } from "../middleware/auth";
import { authService } from "../services/auth.service";
import { emailService } from "../services/email.service";
import { userService } from "../services/user.service";

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
      ...(process.env.DOMAIN && { domain: process.env.DOMAIN }),
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
    callbackUri: (() => {
      // Extract base URL from OAUTH_REDIRECT_URL (e.g., http://localhost:1430/auth/sign-in -> http://localhost:1430)
      if (process.env.FRONTEND_URL) {
        const url = new URL(process.env.FRONTEND_URL);
        return `${url.protocol}//${url.host}/auth/callback`;
      }
      return `${process.env.SERVER_BASE_URL}/auth/callback`;
    })(),
    scope: ["user:email"],
  });

  /**
   * GET /auth/login
   * Initiate GitHub OAuth flow
   */
  fastify.get(
    "/auth/login",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Generate state parameter for CSRF protection
        const state =
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15);

        // Store state in session or cookie for validation
        // For simplicity, we'll use a cookie
        // Debug: Log the state being set
        reply.setCookie("oauth_state", state, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 600, // 10 minutes
          path: "/",
        });
        const githuboAuth2 = fastify.githubOAuth2;
        // Redirect to GitHub OAuth
        const authUrl = await githuboAuth2.generateAuthorizationUri(
          request,
          reply,
        );

        return reply.code(200).send({ authUrl });
      } catch (error) {
        console.error("Login initiation error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to initiate OAuth flow",
        } as ErrorResponse);
      }
    },
  );

  /**
   * GET /auth/callback
   * Handle OAuth callback from GitHub
   */
  fastify.get(
    "/auth/callback",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { code, state } = request.query as {
          code: string;
          state: string;
        };
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
        const tokenResponse =
          await fastify.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(
            request,
          );

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
        const user = await userService.upsertUserFromGitHub(githubUser);

        // Generate JWT tokens
        const { accessToken, refreshToken } = authService.generateTokenPair(
          user.id,
          user.github_id,
          user.email,
        );
        // Redirect to frontend sign-in page after setting cookies
        const oAuthRedirectUrl =
          config.OAUTH_REDIRECT_URL || "http://localhost:1430/auth/sign-in";

        if (process.env.NODE_ENV !== "production") {
          console.log(
            "Setting cookies - accessToken:",
            accessToken?.substring(0, 20) + "...",
          );
          console.log("Setting cookies - domain:", process.env.NODE_ENV);
        }

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

        console.log("Redirecting to:", oAuthRedirectUrl);
        return reply.redirect(oAuthRedirectUrl);
      } catch (error) {
        console.error("OAuth callback error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "OAuth callback failed",
        } as ErrorResponse);
      }
    },
  );

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
    },
  );

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token from cookies
   */
  fastify.post(
    "/auth/refresh",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Extract refresh token from cookies instead of request body
        const refreshToken = authService.extractRefreshTokenFromCookies(
          request.cookies,
        );

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
        const user = await userService.getUserById(payload.userId);

        if (!user) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "User not found",
          } as ErrorResponse);
        }

        // Generate new token pair
        const { accessToken, refreshToken: newRefreshToken } =
          authService.generateTokenPair(user.id, user.github_id, user.email);

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
    },
  );

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
    },
  );

  /**
   * POST /auth/register
   * Register new user with email
   */
  fastify.post(
    "/auth/register",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { email, name } = request.body as { email: string; name?: string };

        // Validate email format
        if (!email || !emailService.validateEmailFormat(email)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid email address",
          } as ErrorResponse);
        }

        // Check if user already exists
        const existingUser = await userService.getUserByEmail(email);
        if (existingUser) {
          return reply.status(409).send({
            error: "Conflict",
            message: "User with this email already exists",
          } as ErrorResponse);
        }

        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expirySeconds = config.EMAIL_EXPIRY_MINUTES * 60;
        // Store verification data in Redis with 10 minute expiration
        const redisKey = `email_registration:${email}`;
        await redis.set(
          redisKey,
          JSON.stringify({ code: verificationCode, name, createdAt: new Date().toISOString() }),
          expirySeconds,
        );
        await userService.createUser({
          email,
          name: name || email.split("@")[0],
        });
        // Send verification email with confirmation code
        await emailService.sendConfirmationCodeEmail({
          to: email,
          confirmationCode: verificationCode,
          recipientName: name || '',
        });

        return reply.send({
          message: "Verification code sent to email",
          email,
          expiresIn: expirySeconds,
        });
      } catch (error) {
        console.error("Registration error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Registration failed",
        } as ErrorResponse);
      }
    },
  );

  /**
   * POST /auth/register/verify
   * Verify email and complete registration
   */
  fastify.post(
    "/auth/register/verify",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { email, code } = request.body as { email: string; code: string };

        // Validate inputs
        if (!email || !code) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Email and verification code are required",
          } as ErrorResponse);
        }

        // Get registration data from Redis
        const redisKey = `email_registration:${email}`;
        const registrationData = await redis.get(redisKey);

        if (!registrationData) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid or expired verification code",
          } as ErrorResponse);
        }

        const { code: storedCode, name } = JSON.parse(registrationData);

        // Verify code
        if (code !== storedCode) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid verification code",
          } as ErrorResponse);
        }

        // Create user
        const user = await userService.createUserFromEmail({
          email,
          name: name || email.split("@")[0],
          email_verified: true,
        });

        // Delete registration data from Redis
        await redis.delete(redisKey);

        // Generate JWT tokens
        const { accessToken, refreshToken } = authService.generateTokenPair(
          user.id,
          "", // No GitHub ID for email users
          user.email
        );

        // Set JWT tokens as cookies
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

        return reply.send({
          message: "Registration successful",
          user,
          accessToken,
        });
      } catch (error) {
        console.error("Registration verification error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to complete registration",
        } as ErrorResponse);
      }
    },
  );

  /**
   * POST /auth/login
   * Login with email (sends verification code)
   */
  fastify.post(
    "/auth/login",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { email } = request.body as { email: string };

        // Validate email format
        if (!email || !emailService.validateEmailFormat(email)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid email address",
          } as ErrorResponse);
        }

        // Check if user exists
        const user = await userService.getUserByEmail(email);
        if (!user) {
          return reply.status(404).send({
            error: "Not Found",
            message: "No account found with this email",
          } as ErrorResponse);
        }

        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Store verification code in Redis with 10 minute expiration
        const redisKey = `email_login:${email}`;
        await redis.set(redisKey, verificationCode, 600);

        // Send verification email
        await emailService.sendConfirmationCodeEmail({
          to: email,
          confirmationCode: verificationCode,
          recipientName: user.name,
        });

        return reply.send({
          message: "Verification code sent to email",
          email,
          expiresIn: 600, // seconds
        });
      } catch (error) {
        console.error("Login error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Login failed",
        } as ErrorResponse);
      }
    },
  );

  /**
   * POST /auth/login/verify
   * Verify email login code
   */
  fastify.post(
    "/auth/login/verify",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { email, code } = request.body as { email: string; code: string };

        // Validate inputs
        if (!email || !code) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Email and verification code are required",
          } as ErrorResponse);
        }

        // Get verification code from Redis
        const redisKey = `email_login:${email}`;
        const storedCode = await redis.get(redisKey);

        if (!storedCode) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid or expired verification code",
          } as ErrorResponse);
        }

        // Verify code
        if (code !== storedCode) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid verification code",
          } as ErrorResponse);
        }

        // Get user
        const user = await userService.getUserByEmail(email);
        if (!user) {
          return reply.status(404).send({
            error: "Not Found",
            message: "User not found",
          } as ErrorResponse);
        }

        // Delete verification code from Redis
        await redis.delete(redisKey);

        // Generate JWT tokens
        const { accessToken, refreshToken } = authService.generateTokenPair(
          user.id,
          user.github_id || "",
          user.email
        );

        // Set JWT tokens as cookies
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

        return reply.send({
          message: "Login successful",
          user,
          accessToken,
        });
      } catch (error) {
        console.error("Login verification error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to complete login",
        } as ErrorResponse);
      }
    },
  );
}
