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

// Mock Redis client that mimics ioredis interface
const mockRedisClient = {
  get: vi.fn().mockImplementation(async (key: string) => {
    const entry = mockRedisStorage.get(key);
    if (!entry || isExpired(entry)) {
      return null;
    }
    return entry.value;
  }),

  set: vi.fn().mockImplementation(async (key: string, value: string, ttlSeconds?: number) => {
    const entry: { value: string; expiresAt?: number } = { value };
    if (ttlSeconds) {
      entry.expiresAt = Date.now() + ttlSeconds * 1000;
    }
    mockRedisStorage.set(key, entry);
    return "OK";
  }),

  setex: vi.fn().mockImplementation(async (key: string, ttl: number, value: string) => {
    const entry = { value, expiresAt: Date.now() + ttl * 1000 };
    mockRedisStorage.set(key, entry);
    return "OK";
  }),

  del: vi.fn().mockImplementation(async (key: string) => {
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
  
  // ioredis-specific methods for filter service
  hset: vi.fn().mockImplementation(async (key: string, field: string, value: string) => {
    const hashKey = `${key}:${field}`;
    mockRedisStorage.set(hashKey, { value });
    return 1;
  }),

  hget: vi.fn().mockImplementation(async (key: string, field: string) => {
    const hashKey = `${key}:${field}`;
    const entry = mockRedisStorage.get(hashKey);
    return entry && !isExpired(entry) ? entry.value : null;
  }),

  hgetall: vi.fn().mockImplementation(async (key: string) => {
    const result: Record<string, string> = {};
    for (const [storageKey, entry] of mockRedisStorage.entries()) {
      if (storageKey.startsWith(key + ':') && !isExpired(entry)) {
        const field = storageKey.substring(key.length + 1);
        result[field] = entry.value;
      }
    }
    return result;
  }),

  lpush: vi.fn().mockResolvedValue(1),
  brpop: vi.fn().mockResolvedValue(null),
  incr: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
  publish: vi.fn().mockResolvedValue(1),
  subscribe: vi.fn().mockResolvedValue(1),
  scan: vi.fn().mockResolvedValue(['0', []]),
  info: vi.fn().mockResolvedValue(''),
  on: vi.fn(),
  quit: vi.fn().mockResolvedValue("OK"),
  
  // Mock options property
  options: {
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: 3
  },

  // Test helper to clear storage
  _clear: () => mockRedisStorage.clear(),
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

  // Add getClient method that returns the mock client
  getClient: vi.fn().mockReturnValue(mockRedisClient),

  // Test helper to clear storage between tests
  _clear: () => mockRedisStorage.clear(),
};

// Mock the Redis module
vi.mock("../../src/config/redis", () => ({
  redis: mockRedis,
  RedisManager: vi.fn().mockImplementation(() => mockRedis),
}));
