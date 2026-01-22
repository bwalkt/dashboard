export function getEnvs(CONFIG: any, prefix = 'REACT_APP') {
  const BASE_API_URL = CONFIG[`${prefix}_API_BASE_URL`] ?? 'http://localhost:8090'
  const env = CONFIG[`${prefix}_NODE_ENV`] ?? 'dev'
  const isDevelopment = env === 'dev'
  const isSimulator = CONFIG[`${prefix}_IS_SIMULATOR`] === 'true'
  return {
    APP_NAME: CONFIG[`${prefix}_APP_NAME`] ?? 'pzero',
    APP_VERSION: CONFIG[`${prefix}_APP_VERSION`] ?? '0.1.0',
    env,
    isDevelopment,
    isSimulator,
    BASE_API_URL,
    SUPPORT_EMAIL: CONFIG[`${prefix}_SUPPORT_EMAIL`] ?? 'support@pzero.com',
    PRIVACY_POLICY_URL: CONFIG[`${prefix}_PRIVACY_POLICY_URL`] ?? `${BASE_API_URL}/privacy`,
    TERMS_OF_SERVICE_URL: CONFIG[`${prefix}_TERMS_OF_SERVICE_URL`] ?? `${BASE_API_URL}/terms`,
    ICON_FETCH_URL: (website: URL, _size = 32) => `https://icons.duckduckgo.com/ip3/${website}.ico`,
    BIOMETRIC_AUTH_ENABLED: CONFIG[`${prefix}_BIOMETRIC_AUTH_ENABLED`] === 'true',
    AUTO_LOCK_TIMEOUT: CONFIG[`${prefix}_AUTO_LOCK_TIMEOUT`]
      ? parseInt(CONFIG[`${prefix}_AUTO_LOCK_TIMEOUT`], 10)
      : 300000,
    GEOAPIFY_API_KEY: CONFIG[`${prefix}_GEOAPIFY_API_KEY`] ?? '',
  }
}
