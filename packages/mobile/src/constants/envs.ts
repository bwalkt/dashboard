import {
  API_BASE_URL as ENV_API_BASE_URL,
  APP_NAME as ENV_APP_NAME,
  APP_VERSION as ENV_APP_VERSION,
  AUTO_LOCK_TIMEOUT as ENV_AUTO_LOCK_TIMEOUT,
  BIOMETRIC_AUTH_ENABLED as ENV_BIOMETRIC_AUTH_ENABLED,
  GEOAPIFY_API_KEY as ENV_GEOAPIFY_API_KEY,
  IS_SIMULATOR as ENV_IS_SIMULATOR,
  NODE_ENV as ENV_NODE_ENV,
  PRIVACY_POLICY_URL as ENV_PRIVACY_POLICY_URL,
  SUPPORT_EMAIL as ENV_SUPPORT_EMAIL,
  TERMS_OF_SERVICE_URL as ENV_TERMS_OF_SERVICE_URL,
  URL as ENV_URL,
} from '@env'

const URL = ENV_URL ?? 'http://localhost'
const BASE_API_URL = ENV_API_BASE_URL ?? 'http://localhost:8090'
const env = ENV_NODE_ENV ?? 'dev'

export const isDevelopment = env === 'dev'
// Fallback to true for development/debugging if env var not loaded
export const isSimulator = ENV_IS_SIMULATOR === 'true'
export const envs = {
  APP_NAME: ENV_APP_NAME ?? 'pzero',
  APP_VERSION: ENV_APP_VERSION ?? '0.1.0',
  env,
  isDevelopment,
  isSimulator,
  BASE_API_URL,
  URL,
  SUPPORT_EMAIL: ENV_SUPPORT_EMAIL ?? 'support@pzero.com',
  PRIVACY_POLICY_URL: ENV_PRIVACY_POLICY_URL ?? `${BASE_API_URL}/privacy-policy`,
  TERMS_OF_SERVICE_URL: ENV_TERMS_OF_SERVICE_URL ?? `${URL}/terms-of-service`,
  ICON_FETCH_URL: (website: URL, _size = 32) => `https://icons.duckduckgo.com/ip3/${website}.ico`,
  BIOMETRIC_AUTH_ENABLED: ENV_BIOMETRIC_AUTH_ENABLED === 'true',
  AUTO_LOCK_TIMEOUT: ENV_AUTO_LOCK_TIMEOUT ? parseInt(ENV_AUTO_LOCK_TIMEOUT, 10) : 300000,
  GEOAPIFY_API_KEY: ENV_GEOAPIFY_API_KEY ?? '',
}
console.log('=== TESTING CONSOLE LOG ===')
console.log('ENV_IS_SIMULATOR raw value:', ENV_IS_SIMULATOR)
console.log('isSimulator calculated:', ENV_IS_SIMULATOR === 'true')
console.log('Environment Variables:', envs)
console.log('=== END TEST ===')
