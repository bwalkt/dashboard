import Twilio from "twilio";
import { config } from "../config/env";

interface SendSMSVerificationOptions {
  to: string;
  code: string;
}

interface VerifySMSCodeOptions {
  to: string;
  code: string;
}

class TwilioService {
  private client: Twilio.Twilio;

  constructor() {
    // Use API Key authentication (recommended)
    this.client = Twilio(config.TWILIO_API_KEY, config.TWILIO_API_SECRET, {
      accountSid: config.TWILIO_ACCOUNT_SID,
    });
  }

  /**
   * Send SMS verification code with custom message or Twilio Verify
   */
  public async sendVerificationSMS(
    options: SendSMSVerificationOptions,
  ): Promise<void> {
    try {
      console.log("📱 Sending SMS verification to:", options.to);

      // Use custom SMS if TWILIO_MESSAGE is set, otherwise use Twilio Verify
      if (config.TWILIO_MESSAGE) {
        console.log("🔧 Using custom SMS with message:", config.TWILIO_MESSAGE);

        const message = config.TWILIO_MESSAGE.replace("{code}", options.code);

        const sms = await this.client.messages.create({
          body: message,
          from: config.TWILIO_PHONE_NUMBER,
          to: options.to,
        });

        console.log("✅ SMS verification sent successfully:", {
          sid: sms.sid,
          status: sms.status,
          to: sms.to,
          body: message,
        });
      } else {
        console.log(
          "🔧 Using Twilio Verify Service:",
          config.TWILIO_VERIFY_SERVICE_SID,
        );

        const verification = await this.client.verify.v2
          .services(config.TWILIO_VERIFY_SERVICE_SID)
          .verifications.create({
            to: options.to,
            channel: "sms",
          });

        console.log("✅ SMS verification sent successfully:", {
          sid: verification.sid,
          status: verification.status,
          to: verification.to,
        });
      }
    } catch (error) {
      console.error("❌ Failed to send SMS verification - Full error:", error);
      if (error instanceof Error) {
        console.error("❌ Error message:", error.message);
        console.error("❌ Error stack:", error.stack);
      }
      throw new Error("Failed to send SMS verification");
    }
  }

  /**
   * Verify SMS code - handles both custom SMS and Twilio Verify
   */
  public async verifySMSCode(
    options: VerifySMSCodeOptions,
  ): Promise<{ valid: boolean; sid?: string; status?: string }> {
    try {
      console.log("🔍 Verifying SMS code for:", options.to);

      if (config.TWILIO_MESSAGE) {
        // Custom SMS verification - this should be handled by Redis in utils/sms-validation.ts
        // Return a default response since verification logic is in the calling function
        return { valid: false };
      } else {
        // Use Twilio Verify API
        const verification = await this.client.verify.v2
          .services(config.TWILIO_VERIFY_SERVICE_SID)
          .verificationChecks.create({
            to: options.to,
            code: options.code,
          });

        console.log("✅ SMS verification result:", {
          sid: verification.sid,
          status: verification.status,
          valid: verification.valid,
        });

        return {
          valid: verification.valid,
          sid: verification.sid,
          status: verification.status,
        };
      }
    } catch (error) {
      console.error("❌ Failed to verify SMS code - Full error:", error);
      if (error instanceof Error) {
        console.error("❌ Error message:", error.message);
      }
      return { valid: false };
    }
  }
}

// Export singleton instance
export const twilioService = new TwilioService();
