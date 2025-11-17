import type { ErrorResponse } from "@pzero/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { redis } from "../config/redis";
import {
  checkSmsRateLimit,
  resendSmsVerification,
  sendSmsVerification,
  validatePhoneNumber,
} from "../utils/sms-validation";

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
        if (!(await validatePhoneNumber(phone, reply))) {
          return;
        }

        // Check rate limiting
        if (!(await checkSmsRateLimit(phone, reply))) {
          return;
        }

        // Send SMS verification
        const result = await sendSmsVerification(phone);
        return reply.send(result);
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
        if (!(await validatePhoneNumber(phone, reply))) {
          return;
        }

        // Check rate limiting with TTL information
        if (!(await checkSmsRateLimit(phone, reply, true))) {
          return;
        }

        // Resend SMS verification
        const result = await resendSmsVerification(phone);
        return reply.send(result);
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
