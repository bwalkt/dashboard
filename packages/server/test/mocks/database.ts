import { vi } from "vitest";

// Mock database implementation for tests
export const mockDb = {
  // Add query method at top level for direct db.query() calls
  query: vi.fn().mockImplementation((query: string) => {
    // Handle proxy targets query
    if (query.includes('proxy_targets')) {
      return Promise.resolve({
        rows: [],
        rowCount: 0,
      });
    }
    // Default response
    return Promise.resolve({ rows: [], rowCount: 0 });
  }),
  pool: {
    query: vi.fn().mockImplementation((query: string) => {
      // Handle user creation query
      if (query.includes('create_user')) {
        return Promise.resolve({
          rows: [{ result: { user_id: 1 } }],
          rowCount: 1,
        });
      }
      
      // Handle user fetch query
      if (query.includes('FROM p0.all_users')) {
        return Promise.resolve({
          rows: [{
            id: 1,
            first_name: 'Test',
            last_name: 'User',
            email: 'test@example.com',
            email_verified: false,
            created_at: new Date(),
            updated_at: new Date(),
          }],
          rowCount: 1,
        });
      }
      
      // Default response
      return Promise.resolve({ rows: [], rowCount: 0 });
    }),
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
