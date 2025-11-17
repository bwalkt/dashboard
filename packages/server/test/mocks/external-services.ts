import { vi } from "vitest";

// Mock external email service
vi.mock("@getbrevo/brevo", () => ({
  TransactionalEmailsApi: vi.fn().mockImplementation(() => ({
    setApiKey: vi.fn(),
    sendTransacEmail: vi.fn().mockResolvedValue({
      response: { statusCode: 201 },
      body: { messageId: "test-message-id" },
    }),
  })),
  TransactionalEmailsApiApiKeys: {
    apiKey: "apiKey",
  },
  SendSmtpEmail: vi.fn(),
}));

// Mock SMS service
vi.mock("@signalwire/realtime-api", () => ({
  RestClient: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        sid: "test-message-sid",
        status: "queued",
      }),
    },
  })),
}));

// Mock axios for any HTTP requests
vi.mock("axios", () => ({
  default: {
    post: vi.fn().mockResolvedValue({
      status: 200,
      data: { success: true },
    }),
    get: vi.fn().mockResolvedValue({
      status: 200,
      data: { success: true },
    }),
    create: vi.fn().mockReturnThis(),
  },
}));
