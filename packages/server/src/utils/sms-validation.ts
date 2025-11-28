import type { ErrorResponse } from "@pzero/shared";
import { formatPhoneE164, validateUSPhoneNumber } from "@pzero/shared/phone";
import { randomInt } from "crypto";
import type { FastifyReply } from "fastify";
import { config } from "../config/env.js";
import { redis } from "../config/redis.js";
import { twilioService } from "../services/twilio.service.js";

/**
 * Generate and store a verification code in Redis (for custom SMS)
 */
async function generateAndStoreCode(formattedPhone: string): Promise<string> {
  // Generate cryptographically secure 6-digit verification code
  const code = randomInt(100000, 1000000).toString();

  // Store verification code in Redis with 10 minute expiry (only for custom SMS)
  if (config.TWILIO_MESSAGE) {
    const verificationKey = `sms_verification_code:${formattedPhone}`;
    await redis.set(verificationKey, code, 600); // 10 minutes
  }

  return code;
}

/**
 * Validate phone number format and return error response if invalid
 * Now uses libphonenumber-js for proper validation
 */
export async function validatePhoneNumber(
  phone: string,
  reply: FastifyReply,
): Promise<boolean> {
  if (!phone) {
    reply.status(400).send({
      error: "Bad Request",
      message: "Phone number is required",
    } as ErrorResponse);
    return false;
  }

  const validationResult = validateUSPhoneNumber(phone);

  if (!validationResult.isValid) {
    reply.status(400).send({
      error: "Bad Request",
      message: validationResult.error || "Invalid phone number format",
    } as ErrorResponse);
    return false;
  }

  return true;
}

/**
 * Check rate limiting for SMS verification and return error response if rate limited
 */
export async function checkSmsRateLimit(
  phone: string,
  reply: FastifyReply,
  includeTtl: boolean = false,
): Promise<boolean> {
  const rateLimitKey = `sms_verification_rate:${phone}`;
  const isRateLimited = await redis.exists(rateLimitKey);

  if (isRateLimited) {
    if (includeTtl) {
      const ttl = await redis.ttl(rateLimitKey);
      reply.status(429).send({
        error: "Too Many Requests",
        message: `Please wait ${ttl} seconds before requesting another verification code`,
      } as ErrorResponse);
    } else {
      reply.status(429).send({
        error: "Too Many Requests",
        message: "Please wait before requesting another verification code",
      } as ErrorResponse);
    }
    return false;
  }

  // Set rate limit (60 seconds)
  await redis.set(rateLimitKey, "1", 60);
  return true;
}

/**
 * Send SMS verification code using Twilio Verify
 */
export async function sendSmsVerification(phone: string): Promise<{
  message: string;
  expiresIn: number;
}> {
  // Format phone number to E.164 format for Twilio
  const formattedPhone = formatPhoneE164(phone, "US");
  if (!formattedPhone) {
    throw new Error("Invalid phone number format for SMS");
  }

  // Generate and store verification code
  const code = await generateAndStoreCode(formattedPhone);

  // Send SMS verification using Twilio (will choose method based on TWILIO_MESSAGE)
  await twilioService.sendVerificationSMS({
    to: formattedPhone,
    code: code,
  });

  return {
    message: "SMS verification code sent successfully",
    expiresIn: 600, // seconds (10 minutes)
  };
}

/**
 * Resend SMS verification code using Twilio Verify
 */
export async function resendSmsVerification(phone: string): Promise<{
  message: string;
  expiresIn: number;
}> {
  // Format phone number to E.164 format for Twilio
  const formattedPhone = formatPhoneE164(phone, "US");
  if (!formattedPhone) {
    throw new Error("Invalid phone number format for SMS");
  }

  // Generate and store verification code
  const code = await generateAndStoreCode(formattedPhone);

  // Resend SMS verification using Twilio (will choose method based on TWILIO_MESSAGE)
  await twilioService.sendVerificationSMS({
    to: formattedPhone,
    code: code,
  });

  return {
    message: "SMS verification code sent successfully",
    expiresIn: 600, // seconds (10 minutes)
  };
}
