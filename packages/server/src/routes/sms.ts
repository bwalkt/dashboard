import type { ErrorResponse } from "@pzero/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { redis } from "../config/redis";
import { smsService } from "../services/sms.service";

export async function smsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /sms/verify
   * Send phone verification code via SMS
   */
  fastify.post(
    "/sms/verify",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { phone } = request.body as { phone: string };

        // Validate phone number format
        if (!phone || !smsService.validatePhoneFormat(phone)) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Invalid phone number format. Please use E.164 format (e.g., +12345678900)",
          } as ErrorResponse);
        }

        // Check rate limiting - allow resend only once every 60 seconds
        const rateLimitKey = `sms_verification_rate:${phone}`;
        const isRateLimited = await redis.exists(rateLimitKey);

        if (isRateLimited) {
          return reply.status(429).send({
            error: "Too Many Requests",
            message: "Please wait before requesting another verification code",
          } as ErrorResponse);
        }

        // Set rate limit (60 seconds)
        await redis.set(rateLimitKey, "1", 60);

        // Generate verification code
        const verificationCode = smsService.generateVerificationCode();

        // Store verification code in Redis with 10 minute expiration
        const redisKey = `phone_verification:${phone}`;
        await redis.set(redisKey, verificationCode, 600);

        // Send SMS with verification code
        await smsService.sendVerificationCode({
          to: phone,
          code: verificationCode,
        });

        return reply.send({
          message: "Verification code sent successfully",
          expiresIn: 600, // seconds
        });
      } catch (error) {
        console.error("Phone verification error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to send verification code",
        } as ErrorResponse);
      }
    },
  );

  /**
   * POST /sms/verify/confirm
   * Verify phone number with code
   */
  fastify.post(
    "/sms/verify/confirm",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { phone, code } = request.body as { phone: string; code: string };

        // Validate inputs
        if (!phone || !code) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Phone number and verification code are required",
          } as ErrorResponse);
        }

        // Get verification code from Redis
        const redisKey = `phone_verification:${phone}`;
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

        // Delete verification code from Redis (one-time use)
        await redis.delete(redisKey);

        return reply.send({
          message: "Phone number verified successfully",
          phone,
          verified: true,
        });
      } catch (error) {
        console.error("Phone verification confirmation error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to verify phone number",
        } as ErrorResponse);
      }
    },
  );

  /**
   * POST /sms/verify/resend
   * Resend phone verification code
   */
  fastify.post(
    "/sms/verify/resend",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { phone } = request.body as { phone: string };

        // Validate phone number format
        if (!phone || !smsService.validatePhoneFormat(phone)) {
          return reply.status(400).send({
            error: "Bad Request",
            message:
              "Invalid phone number format. Please use E.164 format (e.g., +12345678900)",
          } as ErrorResponse);
        }

        // Check rate limiting - allow resend only once every 60 seconds
        const rateLimitKey = `sms_verification_rate:${phone}`;
        const isRateLimited = await redis.exists(rateLimitKey);

        if (isRateLimited) {
          const ttl = await redis.ttl(rateLimitKey);
          return reply.status(429).send({
            error: "Too Many Requests",
            message: `Please wait ${ttl} seconds before requesting another verification code`,
          } as ErrorResponse);
        }

        // Set rate limit (60 seconds)
        await redis.set(rateLimitKey, "1", 60);

        // Generate new verification code
        const verificationCode = smsService.generateVerificationCode();

        // Store verification code in Redis with 10 minute expiration
        const redisKey = `phone_verification:${phone}`;
        await redis.set(redisKey, verificationCode, 600);

        // Send SMS with verification code
        await smsService.sendVerificationCode({
          to: phone,
          code: verificationCode,
        });

        return reply.send({
          message: "Verification code resent successfully",
          expiresIn: 600, // seconds
        });
      } catch (error) {
        console.error("Phone verification resend error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to resend verification code",
        } as ErrorResponse);
      }
    },
  );
}