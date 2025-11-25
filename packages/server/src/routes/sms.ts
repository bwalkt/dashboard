import type { ErrorResponse } from "@pzero/shared";
import { formatPhoneE164 } from "@pzero/shared/phone";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config/env";
import { redis } from "../config/redis";
import { twilioService } from "../services/twilio.service";
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

        // Format phone number to E.164 format
        const formattedPhone = formatPhoneE164(phone, "US");
        if (!formattedPhone) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid phone number format",
          } as ErrorResponse);
        }

        let isValid = false;

        // Choose verification method based on TWILIO_MESSAGE setting
        if (config.TWILIO_MESSAGE) {
          // Custom SMS verification using Redis
          const verificationKey = `sms_verification_code:${formattedPhone}`;
          const storedCode = await redis.get(verificationKey);

          if (!storedCode) {
            return reply.status(400).send({
              error: "Bad Request",
              message: "Verification code has expired or does not exist",
            } as ErrorResponse);
          }

          isValid = storedCode === code;

          if (isValid) {
            // Delete the verification code after successful verification
            await redis.del(verificationKey);
          }
        } else {
          // Twilio Verify API verification
          const verificationResult = await twilioService.verifySMSCode({
            to: formattedPhone,
            code: code,
          });
          isValid = verificationResult.valid;
        }

        if (!isValid) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Invalid or expired verification code",
          } as ErrorResponse);
        }

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
