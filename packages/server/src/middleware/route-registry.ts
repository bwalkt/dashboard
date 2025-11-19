import { PUBLIC_ROUTES, PUBLIC_ROUTE_PATTERNS } from "../constants/routes";

export interface RouteInfo {
  path: string;
  isPublic: boolean;
}

/**
 * Declarative route registry for public routes.
 * This approach is more maintainable and performant than regex parsing.
 * Routes are defined in constants/routes.ts
 */
const PUBLIC_ROUTES_SET = new Set<string>(PUBLIC_ROUTES);

/**
 * Fast, cached route lookup for public routes.
 * No file I/O, no regex parsing - just a simple Set lookup.
 */
export function getAllowedPaths(): string[] {
  return Array.from(PUBLIC_ROUTES_SET);
}

/**
 * Check if a specific path is public (allowed without auth).
 * Uses fast Set lookup and pattern matching.
 *
 * @param path - The path to check (should be pathname without query string)
 */
export function isPublicPath(path: string): boolean {
  if (!path) {
    return false;
  }

  // Extract pathname from URL if it contains query string or hash
  let pathname: string;
  try {
    // Try parsing as URL (works for both full URLs and pathnames with query strings)
    const url = new URL(path, "http://dummy");
    pathname = url.pathname;
  } catch {
    // Fallback: if URL parsing fails, assume it's already a pathname
    pathname = path.split("?")[0]?.split("#")[0] ?? path;
  }

  if (!pathname) {
    return false;
  }

  // Direct match in public routes set
  if (PUBLIC_ROUTES_SET.has(pathname)) {
    return true;
  }

  // Check against route patterns
  return PUBLIC_ROUTE_PATTERNS.some((pattern) => pathname.startsWith(pattern));
}

/**
 * Add a public route at runtime (for dynamic route registration).
 * This allows routes to be registered as public without file changes.
 */
export function addPublicRoute(path: string): void {
  PUBLIC_ROUTES_SET.add(path);
}

/**
 * Remove a public route at runtime.
 */
export function removePublicRoute(path: string): void {
  PUBLIC_ROUTES_SET.delete(path);
}
