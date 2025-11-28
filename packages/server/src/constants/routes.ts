/**
 * Public routes that don't require authentication.
 * These routes are accessible without any authentication headers or cookies.
 */
export const PUBLIC_ROUTES = [
  // Auth routes (registration, login, etc.)
  "/auth/register",
  "/auth/register/verify",
  "/auth/login",
  "/auth/login/verify",
  "/auth/logout",
  "/auth/callback",
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

  // FAQ endpoint (public access)
  "/faq",

  // Terms and conditions endpoint (public access)
  "/terms",
] as const;

/**
 * Route patterns for public routes (support wildcards).
 * Routes starting with these patterns are considered public.
 */
export const PUBLIC_ROUTE_PATTERNS = [
  "/assets/", // All asset paths
  "/public/", // All public paths
  "/docs/", // Documentation paths
  "/proxy/", // Proxy paths
] as const;
