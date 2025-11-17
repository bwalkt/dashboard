export interface RouteInfo {
  path: string;
  isPublic: boolean;
}

/**
 * Declarative route registry for public routes.
 * This approach is more maintainable and performant than regex parsing.
 */
const PUBLIC_ROUTES = new Set([
  // Auth routes (registration, login, etc.)
  "/auth/register",
  "/auth/register/verify",
  "/auth/login",
  "/auth/login/verify",
  "/auth/logout",
  "/auth/callback/github",
  "/auth/refresh",

  // Centrifugo proxy routes (must be public for Centrifugo server to call)
  "/centrifugo/connect",
  "/centrifugo/refresh",
  "/centrifugo/subscribe",
  "/centrifugo/publish",

  // SMS verification routes
  "/sms/verify",
  "/sms/verify/confirm",
  "/sms/verify/resend",

  // Email routes (if any are public)
  "/email/verify",

  // Static assets and health checks
  "/health",
  "/public",
  "/docs",
  "/assets",

  // Add new public routes here as needed
]);

/**
 * Route patterns for public routes (support wildcards)
 */
const PUBLIC_ROUTE_PATTERNS = [
  "/assets/", // All asset paths
  "/public/", // All public paths
  "/docs/", // Documentation paths
];

/**
 * Fast, cached route lookup for public routes.
 * No file I/O, no regex parsing - just a simple Set lookup.
 */
export function getAllowedPaths(): string[] {
  return Array.from(PUBLIC_ROUTES);
}

/**
 * Check if a specific path is public (allowed without auth).
 * Uses fast Set lookup and pattern matching.
 */
export function isPublicPath(path: string): boolean {
  // Direct match in public routes set
  if (PUBLIC_ROUTES.has(path)) {
    return true;
  }

  // Check against route patterns
  return PUBLIC_ROUTE_PATTERNS.some((pattern) => path.startsWith(pattern));
}

/**
 * Add a public route at runtime (for dynamic route registration).
 * This allows routes to be registered as public without file changes.
 */
export function addPublicRoute(path: string): void {
  PUBLIC_ROUTES.add(path);
}

/**
 * Remove a public route at runtime.
 */
export function removePublicRoute(path: string): void {
  PUBLIC_ROUTES.delete(path);
}
