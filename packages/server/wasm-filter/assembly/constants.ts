// constants.ts - Shared constants
export const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB
export const RATE_LIMIT_WINDOW = 60000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 100;

export const ALLOWED_PATHS = [
  "/api/public",
  "/health",
  "/auth/login",
  "/auth/callback"
];

export const BLOCKED_USER_AGENTS = [
  "bot",
  "crawler",
  "spider",
  "scraper"
];

export enum AuthStatus {
  PENDING = 0,
  AUTHENTICATED = 1,
  FAILED = 2,
  BLOCKED = 3
}