import twilio from "twilio";
import { config } from "../config/env.js";

interface SendSMSOptions {
  to: string;
  message: string;
}

interface SendVerificationCodeOptions {
  to: string;
  code: string;
}

class SMSService {
  private client: twilio.Twilio;

  constructor() {
    this.client = twilio(
      config.TWILIO_ACCOUNT_SID,
      config.TWILIO_API_SECRET || config.TWILIO_API_KEY
    );
  }

  /**
   * Send an SMS message using Twilio
   */
  public async sendSMS(options: SendSMSOptions): Promise<void> {
    try {
      console.log("📱 Attempting to send SMS to:", options.to);
      console.log("📱 From:", config.TWILIO_PHONE_NUMBER);

      const result = await this.client.messages.create({
        from: config.TWILIO_PHONE_NUMBER,
        to: options.to,
        body: options.message,
      });

      console.log("✅ SMS sent successfully:", result.sid);
    } catch (error) {
      console.error("❌ Failed to send SMS - Full error:", error);
      console.error("❌ Error type:", typeof error);
      console.error("❌ Error constructor:", error?.constructor?.name);
      if (error instanceof Error) {
        console.error("❌ Error message:", error.message);
        console.error("❌ Error stack:", error.stack);
      }
      throw new Error("Failed to send SMS");
    }
  }

  /**
   * Send verification code via SMS
   */
  public async sendVerificationCode(
    options: SendVerificationCodeOptions,
  ): Promise<void> {
    const message = `Your P-Zero verification code is: ${options.code}\n\nThis code will expire in 10 minutes.`;

    await this.sendSMS({
      to: options.to,
      message,
    });
  }

  /**
   * Send verification code using Twilio Verify Service (if configured)
   */
  public async sendVerificationCodeWithVerify(phone: string): Promise<void> {
    if (!config.TWILIO_VERIFY_SERVICE_SID) {
      throw new Error("Twilio Verify Service SID not configured");
    }

    try {
      const verification = await this.client.verify.v2
        .services(config.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({
          to: phone,
          channel: "sms",
        });

      console.log("✅ Verification sent successfully:", verification.status);
    } catch (error) {
      console.error("❌ Failed to send verification:", error);
      throw new Error("Failed to send verification code");
    }
  }

  /**
   * Check verification code using Twilio Verify Service
   */
  public async checkVerificationCode(phone: string, code: string): Promise<boolean> {
    if (!config.TWILIO_VERIFY_SERVICE_SID) {
      throw new Error("Twilio Verify Service SID not configured");
    }

    try {
      const verificationCheck = await this.client.verify.v2
        .services(config.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({
          to: phone,
          code: code,
        });

      return verificationCheck.status === "approved";
    } catch (error: any) {
      // Check if it's an invalid code (user error) vs system error
      if (error?.status === 404 || error?.code === 20404) {
        // Invalid code, expired verification, or no verification found
        console.log("Invalid or expired verification code");
        return false;
      }
      
      if (error?.status === 429 || error?.code === 20429) {
        // Rate limit error - this should be surfaced to the caller
        console.error("❌ Rate limit exceeded for verification checks");
        throw new Error("Too many attempts. Please try again later.");
      }
      
      // System error - throw to alert caller
      console.error("❌ System error checking verification code:", error);
      throw new Error("Failed to check verification code due to system error");
    }
  }

  /**
   * Validate phone number format (basic E.164 validation)
   */
  public validatePhoneFormat(phone: string): boolean {
    // E.164 format: +[country code][number] (up to 15 digits)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Generate a random 6-digit verification code
   */
  public generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

// Export singleton instance
export const smsService = new SMSService();