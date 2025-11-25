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
   * Send SMS verification code with custom message
   */
  public async sendVerificationSMS(
    options: SendSMSVerificationOptions,
  ): Promise<void> {
    try {
      console.log("📱 Sending SMS verification to:", options.to);
      console.log("🔧 Using code:", options.code);

      const message = `Please use verification code ${options.code} to confirm your enrollment in PZero.`;

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
   * Validate phone number format (basic E.164 validation)
   */
  public validatePhoneFormat(phone: string): boolean {
    // E.164 format: +[country code][number] (up to 15 digits)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }
}

// Export singleton instance
export const twilioService = new TwilioService();
