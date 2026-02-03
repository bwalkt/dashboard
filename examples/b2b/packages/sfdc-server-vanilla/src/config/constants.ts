import { config, expiryStringToSeconds } from './env.js'

export const VALIDATION_HEADER_NAME = 'x-test-eval'

// Refresh token cookie TTL derived from JWT_REFRESH_TOKEN_EXPIRY (default 30 days in seconds)
export const REFRESH_TOKEN_TTL = expiryStringToSeconds(config.JWT_REFRESH_TOKEN_EXPIRY)
