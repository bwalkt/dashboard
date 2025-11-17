import { vi } from "vitest";
import { createEmailCaptureMock } from "./email-capture";

// Mock external email service with email capture capability
vi.mock("@getbrevo/brevo", () => ({
  TransactionalEmailsApi: vi
    .fn()
    .mockImplementation(() => createEmailCaptureMock()),
  TransactionalEmailsApiApiKeys: {
    apiKey: "apiKey",
  },
  SendSmtpEmail: vi.fn(),
}));

// Mock SMS service
vi.mock("@signalwire/realtime-api", () => ({
  SignalWire: vi.fn().mockResolvedValue({
    messaging: {
      send: vi.fn().mockResolvedValue({
        id: "test-message-id",
        status: "queued",
      }),
    },
  }),
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
