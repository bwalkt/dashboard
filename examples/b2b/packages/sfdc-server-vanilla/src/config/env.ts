import dotenv from 'dotenv'
import type { EnvironmentConfig } from '../types/index.js'

// Load environment variables from .env file only when running locally (not in Docker)
// In Docker, environment variables are provided at runtime via docker-compose
if (!process.env.DOCKER_CONTAINER && !process.env.NODE_ENV?.includes('docker')) {
  dotenv.config()
}

/**
 * Converts a zeit/ms-style expiry string (e.g. "1h", "30d") to seconds for cookie maxAge.
 */
export function expiryStringToSeconds(expiry: string): number {
  const match = expiry.trim().match(/^(\d+)(s|m|h|d)$/i)
  if (!match || match[1] === undefined || match[2] === undefined) return 3600 // fallback 1 hour
  const n = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }
  return n * (multipliers[unit] ?? 3600)
}

export const config: EnvironmentConfig = {
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || '',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || '',
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-key-change-in-production',
  JWT_ACCESS_TOKEN_EXPIRY: process.env.JWT_ACCESS_TOKEN_EXPIRY || '1h',
  JWT_REFRESH_TOKEN_EXPIRY: process.env.JWT_REFRESH_TOKEN_EXPIRY || '30d',
  DATABASE_PATH: process.env.DATABASE_PATH || './database.db',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:1420',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
}

/**
 * Validates that required environment variables are set and warns about insecure defaults.
 *
 * Checks for GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and JWT_SECRET; if any are missing it logs the missing keys,
 * prints environment-specific guidance (Docker vs .env), and terminates the process with exit code 1.
 *
 * If JWT_SECRET equals the default development value, logs a warning advising to set a production secret.
 */
export function validateEnvironment(): void {
  const requiredVars = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'JWT_SECRET']

  const missingVars = requiredVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:')
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`)
    })

    // Provide different instructions based on environment
    if (process.env.DOCKER_CONTAINER || process.env.NODE_ENV?.includes('docker')) {
      console.error('\n📝 Please ensure all required variables are set in docker-compose.yml.')
    } else {
      console.error('\n📝 Please check your .env file and ensure all required variables are set.')
    }
    console.error('📄 See env.example for reference.')
    process.exit(1)
  }

  // Warn about default JWT secret
  if (config.JWT_SECRET === 'default-secret-key-change-in-production') {
    console.warn('⚠️  Using default JWT secret. Please set JWT_SECRET environment variable for production.')
  }
}
