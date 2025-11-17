import { vi } from "vitest";

// Storage for captured verification codes
export const capturedEmails: Array<{
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  verificationCode?: string;
}> = [];

// Clear captured emails between tests
export const clearCapturedEmails = () => {
  capturedEmails.length = 0;
};

// Extract verification code from email content
export const extractVerificationCode = (htmlContent: string): string | null => {
  // Look for 6-digit code patterns in HTML content
  const codePatterns = [
    /verification code[^0-9]*(\d{6})/i,
    /confirmation code[^0-9]*(\d{6})/i,
    /code[^0-9]*(\d{6})/i,
    />(\d{6})</i, // Common HTML pattern for codes (fixed: removed global flag)
    /(\d{6})/, // Simple 6-digit pattern
  ];

  for (const pattern of codePatterns) {
    const match = htmlContent.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

// Get the most recent verification code for an email
export const getLatestVerificationCode = (email: string): string | null => {
  const emailRecord = capturedEmails
    .filter((e) => e.to === email)
    .sort((a, b) => capturedEmails.indexOf(b) - capturedEmails.indexOf(a))[0];

  return emailRecord?.verificationCode || null;
};

// Enhanced mock that captures email content and extracts verification codes
export const createEmailCaptureMock = () => {
  const originalSendTransacEmail = vi
    .fn()
    .mockImplementation(async (emailData) => {
      const to = emailData.to?.[0]?.email || "";
      const subject = emailData.subject || "";
      const htmlContent = emailData.htmlContent || "";
      const textContent = emailData.textContent || "";

      // Extract verification code from content
      const verificationCode =
        extractVerificationCode(htmlContent) ||
        extractVerificationCode(textContent || "");

      // Store captured email
      capturedEmails.push({
        to,
        subject,
        htmlContent,
        textContent,
        verificationCode,
      });

      return {
        response: { statusCode: 201 },
        body: { messageId: "test-message-id" },
      };
    });

  return {
    setApiKey: vi.fn(),
    sendTransacEmail: originalSendTransacEmail,
  };
};
