import { vi } from "vitest";

// Mock database implementation for tests
export const mockDb = {
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
  },
  initialize: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  getPool: vi.fn().mockReturnValue({
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  }),
};

// Mock the database module
vi.mock("../../src/config/database", () => ({
  db: mockDb,
  DatabaseManager: vi.fn().mockImplementation(() => mockDb),
}));
