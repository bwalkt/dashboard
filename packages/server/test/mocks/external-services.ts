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

// SMS service is already mocked via the Twilio mock above

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

// Mock filter Redis service
vi.mock("../../src/services/filter-redis.service.js", () => ({
  filterRedisService: {
    init: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
    registerFilter: vi.fn().mockResolvedValue(undefined),
    updateHeartbeat: vi.fn().mockResolvedValue(undefined),
    queueChallengeValidation: vi.fn().mockResolvedValue(undefined),
    getChallengeResult: vi.fn().mockResolvedValue(null),
    updateHeaderInfo: vi.fn().mockResolvedValue(undefined),
    getHeaderInfo: vi.fn().mockResolvedValue({}),
    syncHeaderInfoFromCache: vi.fn().mockResolvedValue(undefined),
    checkRateLimit: vi.fn().mockResolvedValue(true),
    getFilterStats: vi.fn().mockResolvedValue({ total: 0, active: 0, inactive: 0, filters: [] }),
    startChallengeProcessor: vi.fn(),
    stopChallengeProcessor: vi.fn(),
  },
  startChallengeProcessor: vi.fn(),
  stopChallengeProcessor: vi.fn(),
}));
