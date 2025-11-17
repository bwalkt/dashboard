import type { ErrorResponse } from "@pzero/shared";
import type { FastifyReply } from "fastify";
import { redis } from "../config/redis";
import { smsService } from "../services/sms.service";

/**
 * Validate phone number format and return error response if invalid
 *  TODO: Extend to support international numbers
 *. libphonenumber-js
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

  if (!smsService.validatePhoneFormat(phone)) {
    reply.status(400).send({
      error: "Bad Request",
      message: "Invalid phone number format",
    } as ErrorResponse);
    return false;
  }

  // Check if it's a US phone number (country code +1)
  if (!phone.startsWith("+1")) {
    reply.status(400).send({
      error: "Bad Request",
      message: "Only US phone numbers are supported",
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
 * Send SMS verification code and store in Redis
 */
export async function sendSmsVerification(phone: string): Promise<{
  message: string;
  expiresIn: number;
}> {
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

  return {
    message: "SMS verification code sent successfully",
    expiresIn: 600, // seconds
  };
}

/**
 * Resend SMS verification code
 */
export async function resendSmsVerification(phone: string): Promise<{
  message: string;
  expiresIn: number;
}> {
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

  return {
    message: "SMS verification code sent successfully",
    expiresIn: 600, // seconds
  };
}
