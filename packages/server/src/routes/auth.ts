import { randomInt, timingSafeEqual } from "node:crypto";

import oauth2Plugin, { type OAuth2Namespace } from "@fastify/oauth2";
import { type AuthenticatedRequest, type ErrorResponse, generateHandleFromEmail } from "@pzero/shared";
import { CHALLENGE_ID_HEADER, CHALLENGE_PARAMS_HEADER, CHALLENGE_QUESTION_HEADER } from "@pzero/shared/challenge";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config/env.js";
import { redis } from "../config/redis.js";
import { authenticateToken } from "../middleware/auth.js";
import { authService } from "../services/auth.service.js";
import { emailService } from "../services/email.service.js";
import { PROXY_TARGETS_CACHE_KEY, refreshProxyTargetsCache } from "../services/proxy-targets-cache.service.js";
import { type UserWithStatus, userService } from "../services/user.service.js";
import { type ChallengePayload, getChallenge, getChallengePayload, markChallengeUsed } from "../utils/challenge.js";
import { encryptionService } from "../utils/encryption.js";

// Number of challenges to generate per auth request (default is 2 to reduce round-trips)

async function deleteUserSession(request: FastifyRequest, reply: FastifyReply) {
  const userId = extractUserIdFromToken(request);
  if (userId) {
    await userService.deleteUserStatusFromCache(userId);
  }

  // Clear JWT cookies
  reply.clearCookie("accessToken", {
    path: "/",
  });

  reply.clearCookie("refreshToken", {
    path: "/",
  });
}

declare module "fastify" {
  interface FastifyInstance {
    githubOAuth2: OAuth2Namespace;
  }
}

/**
 * Extract user ID from access token cookie.
 * Returns null if token is missing or invalid.
 */
function extractUserIdFromToken(request: FastifyRequest): string | null {
  try {
    const cookieToken = authService.extractTokenFromCookies(request.cookies);
    if (!cookieToken) {
      return null;
    }
    const payload = authService.verifyAccessToken(cookieToken);
    return payload?.userId || null;
  } catch {
    return null;
  }
}

function safeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
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
      const user = await userService.upsertUserFromGitHub(githubUser);

      // Generate JWT tokens
      const { accessToken, refreshToken } = authService.generateTokenPair(user.id, user.github_id, user.email);

      if (config.NODE_ENV !== "production") {
        console.log("Setting cookies - accessToken:", accessToken?.substring(0, 20) + "...");
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
  });
  async function nextHelper(
    user: UserWithStatus,
    request: FastifyRequest,
    reply: FastifyReply,
    sendUser?: boolean,
    challenge?: ChallengePayload,
    challengeId?: string
  ) {
    try {
      if (!user?.data?.grid || user.is_act === undefined) {
        user = (await userService.getUserByEmail(user.email)) as UserWithStatus;
      }
      if (!user?.data?.grid || !user.is_act) {
        console.log("Error - Grid for user not found, or status not ACTIVE:", user);
        await deleteUserSession(request, reply);
        return reply.status(403).send({
          error: "Forbidden",
          message: `User Account is ${user.status ?? "INACTIVE"}`,
        } as ErrorResponse);
      }
      const grid = encryptionService.decrypt(user.data.grid) as number[][];
      console.log("Fetched user info for:", { id: user.id, email: user.email });

      // Check and populate proxy_targets cache if not exists
      const cacheExists = await redis.exists(PROXY_TARGETS_CACHE_KEY);
      if (!cacheExists) {
        console.log("Proxy targets cache not found, populating from database...");
        try {
          await refreshProxyTargetsCache();
          console.log("Proxy targets cache populated successfully");
        } catch (error) {
          console.error("Failed to populate proxy targets cache:", error);
          // Continue with auth/me flow even if cache population fails
        }
      }
      // Send decrypted grid to client (not the encrypted one)
      const userWithDecryptedGrid = {
        ...user,
        data: {
          ...user.data,
          grid: grid, // Send the decrypted grid
        },
      };
      if (sendUser) {
        // Cache user for WASM filter - must include is_act for active user check
        const userKey = `user:${user.email}`;
        const userForCache = {
          ...userWithDecryptedGrid,
          is_act: true, // Explicitly set for WASM filter active user check
        };
        await redis.set(userKey, JSON.stringify(userForCache), 300); // Cache for 5 minutes with TTL
      }

      // Get the next challenge in chain (if exists) for /auth/next flow
      const thisChallenge = challenge && challenge.next ? await getChallengePayload(challenge.next) : null;

      let challengeData: Awaited<ReturnType<typeof getChallenge>>;
      if (challengeId && thisChallenge && challenge?.next) {
        // /auth/next flow: mark current challenge as used, return the next one
        // challengeId = A (used), challenge.next = B's ID, thisChallenge = B's payload
        const nextChallengeId = challenge.next;

        try {
          // Pre-generate C to extend the chain first (before marking A as used)
          // This ensures we have a valid chain before invalidating the current challenge
          const pregenChallenge = await getChallenge(grid, user.id);
          thisChallenge.next = pregenChallenge.id; // B.next = C

          // Update B with new next pointer
          await storeChallengeRecord(nextChallengeId, thisChallenge);

          // Mark A as used only after chain is successfully extended
          await markChallengeUsed(challengeId);

          // Return B's ID and question/params
          challengeData = {
            id: nextChallengeId,
            ...thisChallenge,
          };
          console.log(`[/auth/next] Marked ${challengeId} as used, returning next: ${nextChallengeId}, pre-generated: ${pregenChallenge.id}`);
        } catch (redisError) {
          console.error(`[/auth/next] Redis operation failed for challenge chain:`, redisError);
          // Fall back to generating a fresh challenge if chain operations fail
          challengeData = await getChallenge(grid, user.id);
          console.log(`[/auth/next] Fallback: Generated new challenge: ${challengeData.id}`);
        }
      } else {
        // /auth/me flow or no chain: generate fresh challenge
        challengeData = await getChallenge(grid, user.id);
        console.log(`[/auth] Generated new challenge: ${challengeData.id}`);
      }

      const replyObj = reply
        .header(CHALLENGE_ID_HEADER, challengeData.id)
        .header(CHALLENGE_QUESTION_HEADER, challengeData.question)
        .header(CHALLENGE_PARAMS_HEADER, `x=${challengeData.params.x},y=${challengeData.params.y}`);
      console.log(`[/auth] Sending challenge: ${CHALLENGE_ID_HEADER}=${challengeData.id}`);
      return sendUser ? replyObj.send({ user: userWithDecryptedGrid }) : replyObj.send({ challengeId: challengeData.id });
    } catch (error) {
      console.error("Get user info error:", error);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Failed to get user information",
      } as ErrorResponse);
    }
  }

  async function getChallengeRecord(challengeId: string): Promise<ChallengePayload | null> {
    const redisKey = `challenge:${challengeId}`;
    const raw = await redis.get(redisKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ChallengePayload;
    } catch (error) {
      console.warn("Failed to parse challenge payload:", challengeId, error);
      return null;
    }
  }

  async function storeChallengeRecord(challengeId: string, payload: ChallengePayload): Promise<void> {
    const redisKey = `challenge:${challengeId}`;
    await redis.set(redisKey, JSON.stringify(payload));
  }

  /**
   * POST /auth/me
   * Get current user info (protected route)
   */
  fastify.post(
    "/auth/me",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as unknown as AuthenticatedRequest).user as UserWithStatus;
        return await nextHelper(user, request, reply, true);
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
   * POST /auth/next/:challengeId and /proxy/auth/next/:challengeId
   * Get next challenge in the chain (protected route)
   */
  const authNextHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let user = (request as unknown as AuthenticatedRequest).user as UserWithStatus;
      const { challengeId } = request.params as { challengeId: string };

      if (!challengeId) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "challengeId is required",
        } as ErrorResponse);
      }
      const currentChallenge = await getChallengeRecord(challengeId);
      if (!currentChallenge) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Challenge not found",
        } as ErrorResponse);
      }

      if (!safeEqualString(currentChallenge.uid, user.id)) {
        return reply.status(403).send({
          error: "Forbidden",
          message: "Challenge does not belong to user",
        } as ErrorResponse);
      }

      // The nextHelper will mark the current challenge as used and return the next one in the chain
      return await nextHelper(user, request, reply, false, currentChallenge, challengeId);
    } catch (error) {
      console.error("Get user info error:", error);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Failed to get user information",
      } as ErrorResponse);
    }
  };

  // Register handler for both /auth/next and /proxy/auth/next paths
  fastify.post("/auth/next/:challengeId", { preHandler: authenticateToken }, authNextHandler);
  fastify.post("/proxy/auth/next/:challengeId", { preHandler: authenticateToken }, authNextHandler);

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
      const user = await userService.getUserById(payload.userId.toString());

      if (!user) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "User not found",
        } as ErrorResponse);
      }

      // Generate new token pair
      const { accessToken, refreshToken: newRefreshToken } = authService.generateTokenPair(user.id.toString(), user.github_id, user.email);

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
  });

  /**
   * POST /auth/logout
   * Logout user (invalidate tokens)
   */
  fastify.post("/auth/logout", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await deleteUserSession(request, reply);

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
  });

  /**
   * GET /auth/logout
   * Logout user (invalidate tokens) - GET version for compatibility
   */
  fastify.get("/auth/logout", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await deleteUserSession(request, reply);
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
  });

  /**
   * POST /auth/register
   * Register new user with email
   */
  fastify.post("/auth/register", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, name, device, handle, grid } = request.body as {
        email: string;
        name?: string;
        device?: any;
        handle?: string;
        grid?: number[][];
      };

      console.log("Registration request received:", {
        email: config.NODE_ENV === "production" ? "[REDACTED]" : email,
        name,
        handle: handle ?? generateHandleFromEmail(email),
        deviceInfo: device
          ? {
              id: device.id,
              deviceId: device.deviceId,
              deviceName: device.deviceName,
              model: device.model,
              os: device.os || device.systemName,
              type: device.type,
            }
          : "No device info provided",
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
      const verificationCode = randomInt(100000, 1000000).toString();
      const expirySeconds = config.EMAIL_EXPIRY_MINUTES * 60;
      // Store verification data in Redis with 10 minute expiration
      const redisKey = `email_registration:${email}`;
      const registrationData = {
        code: verificationCode,
        name,
        device,
        grid,
        createdAt: new Date().toISOString(),
      };

      console.log("Storing registration data in Redis:", {
        key: redisKey,
        name,
        hasDevice: !!device,
        deviceType: device?.type,
        expirySeconds,
      });

      await redis.set(redisKey, JSON.stringify(registrationData), expirySeconds);

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
  });

  /**
   * POST /auth/register/verify
   * Verify email and complete registration
   */
  fastify.post("/auth/register/verify", async (request: FastifyRequest, reply: FastifyReply) => {
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

      const { code: storedCode, handle, name, device, grid } = JSON.parse(registrationData);

      console.log("Registration verification attempt:", {
        email: config.NODE_ENV === "production" ? "[REDACTED]" : email,
        name,
        handle: handle ?? generateHandleFromEmail(email),
        hasDevice: !!device,
        deviceDetails: device
          ? {
              id: device.id,
              deviceId: device.deviceId,
              deviceName: device.deviceName,
              model: device.model,
              os: device.os || device.systemName,
              type: device.type,
            }
          : "No device info",
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
        handle,
        grid,
      });

      if (!user) {
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create user account",
        } as ErrorResponse);
      }

      // Cache user status if available
      // createUser joins all_users which includes status, but return type is User
      // Fetch user with status to ensure we have the status field
      const userWithStatus = await userService.getUserByEmail(email);
      if (userWithStatus) {
        await userService.setUserStatusInCache(user.id, userWithStatus.status);
      }

      // Delete registration data from Redis
      await redis.delete(redisKey);

      // Generate JWT tokens
      const { accessToken, refreshToken } = authService.generateTokenPair(
        user.id.toString(),
        "", // No GitHub ID for email users
        user.email
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
  });

  /**
   * POST /auth/login
   * Login with email (sends verification code, or skips OTP if SKIP_OTP is enabled)
   */
  fastify.post("/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
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
      if (user.status != "ACTIVE") {
        return reply.status(403).send({
          error: "Forbidden",
          message: `User Account is ${user.status ?? "INACTIVE"}`,
        } as ErrorResponse);
      }

      // Skip OTP verification if SKIP_OTP is enabled - directly authenticate user
      if (config.SKIP_OTP) {
        // Cache user status if available
        await userService.setUserStatusInCache(user.id, user.status);

        // Generate JWT tokens
        const { accessToken, refreshToken } = authService.generateTokenPair(user.id.toString(), user.github_id || "", user.email);

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
          message: "Login successful (OTP skipped)",
          user,
          accessToken,
        });
      }

      // Generate verification code
      const verificationCode = randomInt(100000, 1000000).toString();

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
  });

  /**
   * POST /auth/login/verify
   * Verify email login code
   */
  fastify.post("/auth/login/verify", async (request: FastifyRequest, reply: FastifyReply) => {
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

      // Cache user status if available
      await userService.setUserStatusInCache(user.id, user.status);

      // Delete verification code from Redis
      await redis.delete(redisKey);

      // Generate JWT tokens
      const { accessToken, refreshToken } = authService.generateTokenPair(user.id.toString(), user.github_id || "", user.email);

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
  });

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
    async (request: FastifyRequest<{ Body: { token: string } }>, reply: FastifyReply) => {
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
    }
  );

  /**
   * POST /auth/reset
   * Reset user's grid password (requires authentication)
   */
  fastify.post<{
    Body: { grid: number[][] };
  }>("/auth/reset", { preHandler: authenticateToken }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as unknown as AuthenticatedRequest).user?.id;
      const { grid } = request.body as { grid: number[][] };

      if (!userId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Authentication required",
        } as ErrorResponse);
      }

      if (!grid || !Array.isArray(grid)) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Grid is required",
        } as ErrorResponse);
      }

      // Validate grid is 5x5 and contains only positive numbers
      if (
        grid.length !== 5 ||
        !grid.every((row) => Array.isArray(row) && row.length === 5 && row.every((cell) => typeof cell === "number" && !isNaN(cell) && cell > 0))
      ) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Grid must be a 5x5 matrix of positive numbers",
        } as ErrorResponse);
      }

      // Update the user's grid in the database
      const updated = await userService.updateUserGrid(userId, grid);

      if (!updated) {
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to reset grid",
        } as ErrorResponse);
      }

      return reply.send({
        message: "Grid successfully reset",
        success: true,
      });
    } catch (error) {
      console.error("Grid reset error:", error);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Failed to reset grid",
      } as ErrorResponse);
    }
  });
}
