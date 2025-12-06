import { type CountryCode } from 'libphonenumber-js'

/**
 * Country configuration for phone number validation
 */
export interface CountryConfig {
  code: CountryCode
  name: string
  callingCode: string
  /**
   * Flag emoji - may not render properly on Android.
   * Use react-native-country-picker-modal or similar library for proper flag display.
   */
  flag?: string
}

/**
 * List of allowed countries for phone number validation.
 * Currently limited to US only, but structured to support future expansion.
 */
export const ALLOWED_COUNTRIES: CountryConfig[] = [
  {
    code: 'US',
    name: 'United States',
    callingCode: '1',
    flag: '🇺🇸',
  },
  {
    code: 'CN',
    name: 'Canada',
    callingCode: '1',
    flag: '🇨🇦',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    callingCode: '44',
    flag: '🇬🇧',
  },
]

/**
 * Default country for phone number validation
 */
export const DEFAULT_COUNTRY: CountryCode = 'US'

/**
 * Get allowed country codes
 */
export function getAllowedCountryCodes(): CountryCode[] {
  return ALLOWED_COUNTRIES.map(country => country.code)
}

/**
 * Check if a country code is allowed
 */
export function isCountryAllowed(countryCode: string): boolean {
  return ALLOWED_COUNTRIES.some(country => country.code === countryCode)
}

/**
 * Get country config by code
 */
export function getCountryConfig(countryCode: CountryCode): CountryConfig | undefined {
  return ALLOWED_COUNTRIES.find(country => country.code === countryCode)
}
