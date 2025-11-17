import { vi } from "vitest";

// Mock Redis implementation for tests
export const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue("OK"),
  delete: vi.fn().mockResolvedValue(1),
  exists: vi.fn().mockResolvedValue(0),
  ttl: vi.fn().mockResolvedValue(-1),
  ping: vi.fn().mockResolvedValue("PONG"),
  initialize: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
};

// Mock the Redis module
vi.mock("../../src/config/redis", () => ({
  redis: mockRedis,
  RedisManager: vi.fn().mockImplementation(() => mockRedis),
}));
