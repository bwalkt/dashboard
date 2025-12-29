import oauth2Plugin, { type OAuth2Namespace } from "@fastify/oauth2";
import {
  type AuthenticatedRequest,
  type ErrorResponse,
  generateHandleFromEmail,
  type UserResponse
} from "@pzero/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config/env.js";
import { redis } from "../config/redis.js";
import { authenticateToken } from "../middleware/auth.js";
import { authService } from "../services/auth.service.js";
import { emailService } from "../services/email.service.js";
import { type UserWithStatus, userService } from "../services/user.service.js";

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
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      ...(config.DOMAIN && { domain: config.DOMAIN }),
      path: "/",
      maxAge: 3600, // 1 hour
    },
    credentials: {
      client: {
        id: config.GITHUB_CLIENT_ID!,
        secret: config.GITHUB_CLIENT_SECRET!,
      },

      auth: {
        authorizeHost: "https://github.com",
        authorizePath: "/login/oauth/authorize",
        tokenHost: "https://github.com",
        tokenPath: "/login/oauth/access_token",
      },
    },
    callbackUri: (() => {
      // Extract base URL from FRONTEND_URL (e.g., http://localhost:1420/auth/sign-in -> http://localhost:1430)
      if (config.FRONTEND_URL) {
        const url = new URL(config.FRONTEND_URL);
        return `${url.protocol}//${url.host}/auth/callback`;
      }
      return `${config.SERVER_BASE_URL}/auth/callback`;
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
        const githubOAuth2 = fastify.githubOAuth2;
        // Redirect to GitHub OAuth
        const authUrl = await githubOAuth2.generateAuthorizationUri(
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

        if (config.NODE_ENV !== "production") {
          console.log(
            "Setting cookies - accessToken:",
            accessToken?.substring(0, 20) + "...",
          );
          console.log("Setting cookies - environment:", config.NODE_ENV);
          console.log("Setting cookies - domain:", config.DOMAIN);
        }

        reply.setCookie("accessToken", accessToken, {
          httpOnly: true,
          secure: config.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 3600, // 1 hour
        });
        reply.setCookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: config.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 3600 * 24 * 30, // 30 days
        });

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
        const user = await userService.getUserById(payload.userId.toString());

        if (!user) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "User not found",
          } as ErrorResponse);
        }

        // Generate new token pair
        const { accessToken, refreshToken: newRefreshToken } =
          authService.generateTokenPair(
            user.id.toString(),
            user.github_id,
            user.email,
          );

        // Set JWT tokens as cookies
        reply.setCookie("accessToken", accessToken, {
          httpOnly: true,
          secure: config.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 3600, // 1 hour
        });

        reply.setCookie("refreshToken", newRefreshToken, {
          httpOnly: true,
          secure: config.NODE_ENV === "production",
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
   * GET /auth/logout
   * Logout user (invalidate tokens) - GET version for compatibility
   */
  fastify.get(
    "/auth/logout",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Clear JWT cookies
        reply.clearCookie("accessToken", {
          path: "/",
        });

        reply.clearCookie("refreshToken", {
          path: "/",
        });

        // Return success message
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
        const { email, name, device, handle } = request.body as {
          email: string;
          name?: string;
          device?: any
          handle?: string
        };

        console.log('Registration request received:', {
          email,
          name,
          handle: handle ?? generateHandleFromEmail(email),
          deviceInfo: device ? {
            id: device.id,
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            model: device.model,
            os: device.os || device.systemName,
            type: device.type
          } : 'No device info provided'
        });

        // Validate required fields
        if (!email || !name) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Name and email are required",
          } as ErrorResponse);
        }

        // Validate email format
        if (!emailService.validateEmailFormat(email)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid email address",
          } as ErrorResponse);
        }

        // Check rate limiting for registration attempts - 1 attempt per email every 60 seconds
        const rateLimitKey = `email_registration_rate:${email}`;
        const ttl = await redis.ttl(rateLimitKey);

        if (ttl > 0) {
          return reply.status(429).send({
            error: "Too Many Requests",
            message: `Please wait ${ttl} seconds before requesting another verification email`,
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
        const verificationCode = Math.floor(
          100000 + Math.random() * 900000,
        ).toString();
        const expirySeconds = config.EMAIL_EXPIRY_MINUTES * 60;
        // Store verification data in Redis with 10 minute expiration
        const redisKey = `email_registration:${email}`;
        const registrationData = {
          code: verificationCode,
          name,
          device,
          createdAt: new Date().toISOString(),
        };
        
        console.log('Storing registration data in Redis:', {
          key: redisKey,
          name,
          hasDevice: !!device,
          deviceType: device?.type,
          expirySeconds
        });
        
        await redis.set(
          redisKey,
          JSON.stringify(registrationData),
          expirySeconds,
        );

        // Send verification email with confirmation code
        await emailService.sendConfirmationCodeEmail({
          to: email,
          confirmationCode: verificationCode,
          recipientName: name || "",
        });

        // Set rate limit after successful email send (60 seconds)
        await redis.set(rateLimitKey, "1", 60);

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

        // Check rate limiting for verification attempts - allow attempts only once every 60 seconds per email
        const rateLimitKey = `email_register_verify_rate:${email}`;
        const ttl = await redis.ttl(rateLimitKey);

        if (ttl > 0) {
          return reply.status(429).send({
            error: "Too Many Requests",
            message: `Please wait ${ttl} seconds before attempting verification again`,
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

        const { code: storedCode, handle, name, device } = JSON.parse(registrationData);

        console.log('Registration verification attempt:', {
          email,
          name,
          handle: handle ?? generateHandleFromEmail(email),
          hasDevice: !!device,
          deviceDetails: device ? {
            id: device.id,
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            model: device.model,
            os: device.os || device.systemName,
            type: device.type
          } : 'No device info'
        });

        // Verify code
        if (code !== storedCode) {
          // Set rate limit to prevent brute-force attacks (60 seconds)
          await redis.set(rateLimitKey, "1", 60);

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
          handle
        });

        if (!user) {
          return reply.status(500).send({
            error: "Internal Server Error",
            message: "Failed to create user account",
          } as ErrorResponse);
        }

        // Delete registration data from Redis
        await redis.delete(redisKey);

        // Generate JWT tokens
        const { accessToken, refreshToken } = authService.generateTokenPair(
          user.id.toString(),
          "", // No GitHub ID for email users
          user.email,
        );

        // Set JWT tokens as cookies
        reply.setCookie("accessToken", accessToken, {
          httpOnly: true,
          secure: config.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 3600, // 1 hour
        });

        reply.setCookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: config.NODE_ENV === "production",
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

        // Check rate limiting for login attempts - 1 attempt per email every 60 seconds
        const rateLimitKey = `email_login_rate:${email}`;
        const ttl = await redis.ttl(rateLimitKey);

        if (ttl > 0) {
          return reply.status(429).send({
            error: "Too Many Requests",
            message: `Please wait ${ttl} seconds before requesting another verification code`,
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
        const verificationCode = Math.floor(
          100000 + Math.random() * 900000,
        ).toString();

        // Store verification code in Redis
        const expirySeconds = config.EMAIL_EXPIRY_MINUTES * 60;
        const redisKey = `email_login:${email}`;
        await redis.set(redisKey, verificationCode, expirySeconds);

        // Send verification email
        await emailService.sendConfirmationCodeEmail({
          to: email,
          confirmationCode: verificationCode,
          recipientName: user.name,
        });

        // Set rate limit after successful email send (60 seconds)
        await redis.set(rateLimitKey, "1", 60);

        return reply.send({
          message: "Verification code sent to email",
          email,
          expiresIn: expirySeconds,
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

        // Check rate limiting - allow verification attempts only once every 60 seconds per email
        const rateLimitKey = `email_login_verify_rate:${email}`;
        const ttl = await redis.ttl(rateLimitKey);

        if (ttl > 0) {
          return reply.status(429).send({
            error: "Too Many Requests",
            message: `Please wait ${ttl} seconds before attempting verification again`,
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
          // Set rate limit to prevent brute-force attacks (60 seconds)
          await redis.set(rateLimitKey, "1", 60);

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

        // Store user status in Redis
        try {
          const statusKey = `status:${user.id}`;
          const userStatus = user.status || 'ACTIVE';
          await redis.set(statusKey, userStatus);
        } catch (redisError) {
          // Log error but don't fail the login (status storage is supplementary)
          console.error('Failed to store user status in Redis:', redisError);
        }

        // Delete verification code from Redis
        await redis.delete(redisKey);

        // Generate JWT tokens
        const { accessToken, refreshToken } = authService.generateTokenPair(
          user.id.toString(),
          user.github_id || "",
          user.email,
        );

        // Set JWT tokens as cookies
        reply.setCookie("accessToken", accessToken, {
          httpOnly: true,
          secure: config.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 3600, // 1 hour
        });

        reply.setCookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: config.NODE_ENV === "production",
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

  // Centrifuge authentication validation endpoint
  fastify.post(
    "/auth/validate-token",
    {
      schema: {
        summary: "Validate authentication token for Centrifuge",
        tags: ["auth", "centrifuge"],
        body: {
          type: "object",
          properties: {
            token: { type: "string" },
          },
          required: ["token"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              valid: { type: "boolean" },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  email: { type: "string" },
                  name: { type: "string" },
                  role: { type: "array", items: { type: "string" } },
                  verified: { type: "boolean" },
                },
              },
            },
          },
          401: {
            type: "object",
            properties: {
              valid: { type: "boolean" },
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { token: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const { token } = request.body;

        if (!token) {
          return reply.status(401).send({
            valid: false,
            error: "Token is required",
          });
        }

        // Validate token using auth service
        const result = await authService.validateToken(token);

        if (!result.valid || !result.user) {
          return reply.status(401).send({
            valid: false,
            error: "Invalid or expired token",
          });
        }

        // Return user information for Centrifuge
        return reply.status(200).send({
          valid: true,
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role || [],
            verified: result.user.verified || false,
          },
        });
      } catch (error) {
        console.error("Token validation error:", error);
        return reply.status(401).send({
          valid: false,
          error: "Token validation failed",
        });
      }
    },
  );
}
