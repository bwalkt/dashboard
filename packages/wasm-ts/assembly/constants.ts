export const CHALLENGE_HEADER = 'x-challenge'
export const CHALLENGE_ID_HEADER = 'x-challenge-id'
export const CHALLENGE_ANSWER_HEADER = 'x-challenge-answer'
export const SHARED_DATA_KEY_PREFIX = 'challenge:'

// Public routes that don't require authentication
export const PUBLIC_ROUTES: string[] = [
  '/auth/register',
  '/auth/register/verify',
  '/auth/login',
  '/auth/login/verify',
  '/auth/logout',
  '/auth/callback',
  '/auth/callback/github',
  '/auth/refresh',
  '/centrifugo/connect',
  '/centrifugo/refresh',
  '/centrifugo/subscribe',
  '/centrifugo/publish',
  '/sms/verify',
  '/sms/verify/confirm',
  '/sms/verify/resend',
  '/email/verify',
  '/health',
  '/public',
  '/docs',
  '/assets',
  '/faq',
  '/terms',
  '/privacy',
  '/proxy/auth/login',
  '/proxy/auth/callback',
  '/proxy/auth/refresh',
]

// Login routes that require challenge header injection
export const LOGIN_ROUTES: string[] = ['/proxy/auth/callback', '/proxy/auth/refresh']

// Time-to-live for challenge data in shared storage (in seconds)
// Challenges expire after 1 hour to prevent stale challenges from accumulating
export const CHALLENGE_TTL_SECONDS: u32 = 3600
