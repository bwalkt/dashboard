import { vi } from "vitest";
import { createEmailCaptureMock } from "./email-capture";

// Mock external email service with email capture capability
vi.mock("@getbrevo/brevo", () => ({
  TransactionalEmailsApi: function() {
    return createEmailCaptureMock();
  },
  TransactionalEmailsApiApiKeys: {
    apiKey: "apiKey",
  },
  SendSmtpEmail: vi.fn(),
}));

// Mock Twilio service
vi.mock("twilio", () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        sid: "test-message-sid",
        status: "sent",
        to: "+12125551234",
      }),
    },
    verify: {
      v2: {
        services: vi.fn(() => ({
          verifications: {
            create: vi.fn().mockResolvedValue({
              sid: "test-verification-sid",
              status: "pending",
            }),
          },
          verificationChecks: {
            create: vi.fn().mockResolvedValue({
              sid: "test-check-sid",
              status: "approved",
            }),
          },
        })),
      },
    },
  })),
  Twilio: vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        sid: "test-message-sid",
        status: "sent",
        to: "+12125551234",
      }),
    },
    verify: {
      v2: {
        services: vi.fn(() => ({
          verifications: {
            create: vi.fn().mockResolvedValue({
              sid: "test-verification-sid",
              status: "pending",
            }),
          },
          verificationChecks: {
            create: vi.fn().mockResolvedValue({
              sid: "test-check-sid",
              status: "approved",
            }),
          },
        })),
      },
    },
  })),
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
