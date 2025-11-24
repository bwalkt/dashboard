import { SignalWire } from "@signalwire/realtime-api";
import { config } from "../config/env";

interface SendSMSOptions {
  to: string;
  message: string;
}

interface SendVerificationCodeOptions {
  to: string;
  code: string;
}

class SMSService {
  private client!: Awaited<ReturnType<typeof SignalWire>>;
  private clientPromise: Promise<void>;

  constructor() {
    this.clientPromise = this.initializeClient();
  }

  private async initializeClient() {
    this.client = await SignalWire({
      project: config.SIGNALWIRE_PROJECT_ID,
      token: config.SIGNALWIRE_TOKEN,
    });
  }

  /**
   * Ensure the client is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    await this.clientPromise;
  }

  /**
   * Send an SMS message using SignalWire
   */
  public async sendSMS(options: SendSMSOptions): Promise<void> {
    try {
      console.log("🔧 Ensuring client is initialized...");
      await this.ensureInitialized();
      console.log("📱 Attempting to send SMS to:", options.to);
      console.log("📱 From:", config.SIGNALWIRE_PHONE_NUMBER);

      const result = await this.client.messaging.send({
        from: config.SIGNALWIRE_PHONE_NUMBER,
        to: options.to,
        body: options.message,
      });

      console.log("✅ SMS sent successfully:", result);
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
