import crypto from "node:crypto";
import type { ErrorResponse } from "@pzero/shared";
import { render } from "@react-email/render";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { redis } from "../config/redis.js";
import SlackStyleConfirmEmail from "../emails/slack-style-confirm.js";
import VerificationEmail from "../emails/verification-email.js";
import { emailService } from "../services/email.service.js";

interface SendVerificationEmailRequest {
  Body: {
    email: string;
    name?: string;
  };
}

interface SendConfirmationCodeRequest {
  Body: {
    email: string;
    confirmationCode: string;
    recipientName?: string;
  };
}

interface VerifyEmailRequest {
  Querystring: {
    token: string;
  };
}

export async function emailRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /verify/email
   * Send email verification
   */
  fastify.post<SendVerificationEmailRequest>(
    "/verify/email",
    async (
      request: FastifyRequest<SendVerificationEmailRequest>,
      reply: FastifyReply,
    ) => {
      try {
        const { email, name } = request.body;

        // Validate email format
        if (!email || !emailService.validateEmailFormat(email)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid email address",
          } as ErrorResponse);
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString("hex");

        // Store token in Redis with 24-hour expiration
        const redisKey = `email_verification:${verificationToken}`;
        await redis.set(
          redisKey,
          JSON.stringify({ email, name, createdAt: new Date().toISOString() }),
          86400,
        ); // 24 hours

        // Send verification email
        await emailService.sendVerificationEmail({
          to: email,
          verificationToken,
          ...(name && { name }),
        });

        return reply.status(200).send({
          message: "Verification email sent successfully",
          email,
        });
      } catch (error) {
        console.error("Send verification email error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to send verification email",
        } as ErrorResponse);
      }
    },
  );

  /**
   * GET /verify/email
   * Verify email with token
   */
  fastify.get<VerifyEmailRequest>(
    "/verify/email",
    async (
      request: FastifyRequest<VerifyEmailRequest>,
      reply: FastifyReply,
    ) => {
      try {
        const { token } = request.query;

        if (!token) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Verification token is required",
          } as ErrorResponse);
        }

        // Check if token exists in Redis
        const redisKey = `email_verification:${token}`;
        const tokenData = await redis.get(redisKey);

        if (!tokenData) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid or expired verification token",
          } as ErrorResponse);
        }

        // Parse token data
        const { email, name } = JSON.parse(tokenData);

        // Delete token from Redis (one-time use)
        await redis.delete(redisKey);

        // Token is valid
        return reply.status(200).send({
          message: "Email verified successfully",
          email,
          verified: true,
        });
      } catch (error) {
        console.error("Verify email error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to verify email",
        } as ErrorResponse);
      }
    },
  );

  /**
   * POST /verify/email/resend
   * Resend verification email
   */
  fastify.post<SendVerificationEmailRequest>(
    "/verify/email/resend",
    async (
      request: FastifyRequest<SendVerificationEmailRequest>,
      reply: FastifyReply,
    ) => {
      try {
        const { email, name } = request.body;

        // Validate email format
        if (!email || !emailService.validateEmailFormat(email)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid email address",
          } as ErrorResponse);
        }

        // Check rate limiting - allow resend only once every 60 seconds
        const rateLimitKey = `email_verification_rate:${email}`;
        const isRateLimited = await redis.exists(rateLimitKey);

        if (isRateLimited) {
          return reply.status(429).send({
            error: "Too Many Requests",
            message: "Please wait before requesting another verification email",
          } as ErrorResponse);
        }

        // Set rate limit (60 seconds)
        await redis.set(rateLimitKey, "1", 60);

        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString("hex");

        // Store token in Redis with 24-hour expiration
        const redisKey = `email_verification:${verificationToken}`;
        await redis.set(
          redisKey,
          JSON.stringify({ email, name, createdAt: new Date().toISOString() }),
          86400,
        );

        // Send verification email
        await emailService.sendVerificationEmail({
          to: email,
          verificationToken,
          ...(name && { name }),
        });

        return reply.status(200).send({
          message: "Verification email resent successfully",
          email,
        });
      } catch (error) {
        console.error("Resend verification email error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to resend verification email",
        } as ErrorResponse);
      }
    },
  );

  /**
   * POST /email/confirmation-code
   * Send confirmation code email using Slack-style template
   */
  fastify.post<SendConfirmationCodeRequest>(
    "/email/confirmation-code",
    async (
      request: FastifyRequest<SendConfirmationCodeRequest>,
      reply: FastifyReply,
    ) => {
      try {
        const { email, confirmationCode, recipientName } = request.body;

        // Validate email format
        if (!email || !emailService.validateEmailFormat(email)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid email address",
          } as ErrorResponse);
        }

        if (!confirmationCode) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Confirmation code is required",
          } as ErrorResponse);
        }

        // Send confirmation code email
        await emailService.sendConfirmationCodeEmail({
          to: email,
          confirmationCode,
          ...(recipientName && { recipientName }),
        });

        return reply.status(200).send({
          message: "Confirmation code email sent successfully",
          email,
        });
      } catch (error) {
        console.error("Send confirmation code email error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to send confirmation code email",
        } as ErrorResponse);
      }
    },
  );

  /**
   * GET /email/preview/slack-confirm
   * Preview Slack-style confirmation email template
   */
  fastify.get(
    "/email/preview/slack-confirm",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const html = await render(
          SlackStyleConfirmEmail({
            confirmationCode: "843592",
            recipientName: "John Doe",
          }),
          {
            pretty: true,
          },
        );

        return reply.type("text/html").send(html);
      } catch (error) {
        console.error("Preview email error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to preview email",
        } as ErrorResponse);
      }
    },
  );

  /**
   * GET /email/preview/verification
   * Preview verification email template
   */
  fastify.get(
    "/email/preview/verification",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const html = await render(
          VerificationEmail({
            name: "John Doe",
            verificationLink: "https://example.com/verify/email?token=abc123",
          }),
          {
            pretty: true,
          },
        );

        return reply.type("text/html").send(html);
      } catch (error) {
        console.error("Preview email error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to preview email",
        } as ErrorResponse);
      }
    },
  );
}
