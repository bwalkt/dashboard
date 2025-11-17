import { vi } from "vitest";

// In-memory storage to simulate Redis state during tests
const mockRedisStorage = new Map<
  string,
  { value: string; expiresAt?: number }
>();

// Helper to check if key is expired
const isExpired = (entry: { value: string; expiresAt?: number }) => {
  return entry.expiresAt && Date.now() > entry.expiresAt;
};

// Mock Redis implementation for tests with state
export const mockRedis = {
  get: vi.fn().mockImplementation(async (key: string) => {
    const entry = mockRedisStorage.get(key);
    if (!entry || isExpired(entry)) {
      return null;
    }
    return entry.value;
  }),

  set: vi
    .fn()
    .mockImplementation(
      async (key: string, value: string, ttlSeconds?: number) => {
        const entry: { value: string; expiresAt?: number } = { value };
        if (ttlSeconds) {
          entry.expiresAt = Date.now() + ttlSeconds * 1000;
        }
        mockRedisStorage.set(key, entry);
        return "OK";
      },
    ),

  delete: vi.fn().mockImplementation(async (key: string) => {
    return mockRedisStorage.delete(key) ? 1 : 0;
  }),

  exists: vi.fn().mockImplementation(async (key: string) => {
    const entry = mockRedisStorage.get(key);
    return entry && !isExpired(entry) ? 1 : 0;
  }),

  ttl: vi.fn().mockImplementation(async (key: string) => {
    const entry = mockRedisStorage.get(key);
    if (!entry || !entry.expiresAt) {
      return -1;
    }
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }),

  ping: vi.fn().mockResolvedValue("PONG"),
  initialize: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),

  // Test helper to clear storage between tests
  _clear: () => mockRedisStorage.clear(),
};

// Mock the Redis module
vi.mock("../../src/config/redis", () => ({
  redis: mockRedis,
  RedisManager: vi.fn().mockImplementation(() => mockRedis),
}));
