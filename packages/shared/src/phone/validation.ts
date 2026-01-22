import {
  type CountryCode,
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  type PhoneNumber,
  parsePhoneNumberWithError,
} from 'libphonenumber-js'

/**
 * Phone validation result interface
 */
export interface PhoneValidationResult {
  isValid: boolean
  isPossible: boolean
  formatted?: string
  country?: string
  countryCallingCode?: string
  nationalNumber?: string
  type?: string
  error?: string
}

/**
 * Validate and parse a phone number
 */
export function validatePhoneNumber(phoneNumber: string, defaultCountry?: CountryCode): PhoneValidationResult {
  try {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return {
        isValid: false,
        isPossible: false,
        error: 'Phone number is required and must be a string',
      }
    }

    // Check if it's a possible phone number first
    const isPossible = isPossiblePhoneNumber(phoneNumber, defaultCountry)

    if (!isPossible) {
      return {
        isValid: false,
        isPossible: false,
        error: 'Phone number format is not possible',
      }
    }

    // Check if it's a valid phone number
    const isValid = isValidPhoneNumber(phoneNumber, defaultCountry)

    if (!isValid) {
      return {
        isValid: false,
        isPossible: true,
        error: 'Phone number is not valid',
      }
    }

    // Parse the phone number to get detailed information
    const parsed = parsePhoneNumberWithError(phoneNumber, defaultCountry)

    return {
      isValid: true,
      isPossible: true,
      formatted: parsed.format('INTERNATIONAL'),
      country: parsed.country,
      countryCallingCode: parsed.countryCallingCode,
      nationalNumber: parsed.nationalNumber,
      type: parsed.getType() || undefined,
    }
  } catch (error) {
    return {
      isValid: false,
      isPossible: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    }
  }
}

/**
 * Check if phone number is valid
 */
export function isValidPhone(phoneNumber: string, defaultCountry?: CountryCode): boolean {
  return isValidPhoneNumber(phoneNumber, defaultCountry)
}

/**
 * Check if phone number is possible (loose validation)
 */
export function isPossiblePhone(phoneNumber: string, defaultCountry?: CountryCode): boolean {
  return isPossiblePhoneNumber(phoneNumber, defaultCountry)
}

/**
 * Format phone number to international format
 */
export function formatPhoneInternational(phoneNumber: string, defaultCountry?: CountryCode): string | null {
  try {
    const parsed = parsePhoneNumberWithError(phoneNumber, defaultCountry)
    return parsed.format('INTERNATIONAL')
  } catch {
    return null
  }
}

/**
 * Format phone number to national format
 */
export function formatPhoneNational(phoneNumber: string, defaultCountry?: CountryCode): string | null {
  try {
    const parsed = parsePhoneNumberWithError(phoneNumber, defaultCountry)
    return parsed.format('NATIONAL')
  } catch {
    return null
  }
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneE164(phoneNumber: string, defaultCountry?: CountryCode): string | null {
  try {
    const parsed = parsePhoneNumberWithError(phoneNumber, defaultCountry)
    return parsed.format('E.164')
  } catch {
    return null
  }
}

/**
 * Get phone number country
 */
export function getPhoneCountry(phoneNumber: string, defaultCountry?: CountryCode): string | null {
  try {
    const parsed = parsePhoneNumberWithError(phoneNumber, defaultCountry)
    return parsed.country || null
  } catch {
    return null
  }
}

/**
 * Check if phone number is from a specific country
 */
export function isPhoneFromCountry(phoneNumber: string, country: CountryCode, defaultCountry?: CountryCode): boolean {
  try {
    const parsed = parsePhoneNumberWithError(phoneNumber, defaultCountry)
    return parsed.country === country
  } catch {
    return false
  }
}

/**
 * Validate US phone number specifically
 */
export function validateUSPhoneNumber(phoneNumber: string): PhoneValidationResult {
  const result = validatePhoneNumber(phoneNumber, 'US')

  if (result.isValid && result.country !== 'US') {
    return {
      isValid: false,
      isPossible: result.isPossible,
      error: 'Only US phone numbers are supported',
    }
  }

  return result
}

/**
 * Simple phone format validation (legacy compatibility)
 */
export function validatePhoneFormat(phoneNumber: string): boolean {
  return isValidPhoneNumber(phoneNumber)
}

// Re-export useful types and functions from libphonenumber-js
export {
  type CountryCode,
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  type PhoneNumber,
  parsePhoneNumberWithError,
} from 'libphonenumber-js'
