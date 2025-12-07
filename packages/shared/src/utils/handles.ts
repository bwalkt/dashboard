/**
 * Reusable handle generation utilities for all database objects
 */

export interface HandleOptions {
  /** Maximum length for the handle (default: 50) */
  maxLength?: number
  /** Whether to preserve dots in the handle (default: false) */
  preserveDots?: boolean
  /** Custom separator to replace spaces/invalid chars (default: '-') */
  separator?: string
  /** Whether to trim separators from start/end (default: true) */
  trimSeparators?: boolean
}

/**
 * Generate a URL-friendly handle from any text input
 * This is the main function that other utilities should use
 */
export function generateHandle(text: string, options: HandleOptions = {}): string {
  const { maxLength = 50, preserveDots = false, separator = '-', trimSeparators = true } = options

  if (!text || text.trim() === '') {
    return ''
  }

  let handle = text.toLowerCase().trim()

  // Replace invalid characters, preserving dots if requested
  if (preserveDots) {
    // For email-style handles, preserve dots but replace other invalid chars
    handle = handle.replace(/[^\w.-]/g, separator)
  } else {
    // Standard handle: only allow word chars and separator
    handle = handle.replace(/[^\w\s-]/g, '')
    // Replace spaces and multiple separators with single separator
    handle = handle.replace(/\s+/g, separator)
  }

  // Replace multiple separators with single separator
  const separatorRegex = new RegExp(`${separator}+`, 'g')
  handle = handle.replace(separatorRegex, separator)

  // Trim separators from start and end if requested
  if (trimSeparators) {
    const trimRegex = new RegExp(`^${separator}+|${separator}+$`, 'g')
    handle = handle.replace(trimRegex, '')
  }

  // Truncate to max length
  if (maxLength > 0) {
    handle = handle.substring(0, maxLength)

    // If we truncated in the middle of a word, try to end at a separator
    if (trimSeparators && handle.endsWith(separator)) {
      handle = handle.replace(new RegExp(`${separator}+$`), '')
    }
  }

  return handle
}

/**
 * Generate handle from organization/company name
 */
export function generateOrgHandle(name: string): string {
  return generateHandle(name, {
    maxLength: 50,
    preserveDots: false,
    separator: '-',
  })
}

/**
 * Generate handle from user's name (for username-style handles)
 */
export function generateUserHandle(name: string): string {
  return generateHandle(name, {
    maxLength: 30,
    preserveDots: false,
    separator: '-',
  })
}

/**
 * Generate handle from email address (preserving structure but making it URL-safe)
 */
export function generateEmailHandle(email: string): string {
  if (!email || !email.includes('@')) {
    return ''
  }

  // Take the local part of the email (before @)
  const localPart = email.split('@')[0]

  return generateHandle(localPart, {
    maxLength: 20,
    preserveDots: true,
    separator: '_',
  })
}

/**
 * Generate device nickname from user's name and device info
 * This matches the pattern used in mobile/src/screens/SettingsScreen.tsx
 */
export function generateDeviceNicknameFromName(userName: string, deviceName?: string): string {
  if (!userName || userName.trim() === '') {
    return ''
  }

  // Take the first name
  const firstName = userName.trim().split(' ')[0]
  const device = deviceName || 'Device'

  return `${firstName}'s ${device}`
}

/**
 * Generate name from email address (for auto-filling forms)
 */
export function generateNameFromEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return ''
  }

  const localPart = email.split('@')[0]

  // Split by dots and capitalize each word
  return localPart
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Extract company info from website domain
 */
export function extractCompanyInfoFromDomain(website: string): {
  domain: string
  companyName: string
  handle: string
} {
  if (!website || website.trim() === '') {
    throw new Error('Invalid website URL')
  }

  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`)
    const domain = url.hostname.replace('www.', '')
    
    // Additional validation: ensure the domain has at least one dot (proper domain structure)
    if (!domain.includes('.') || domain === website) {
      throw new Error('Invalid website URL')
    }
    
    const domainParts = domain.split('.')
    const companyName = domainParts[0]

    const handle = generateOrgHandle(companyName)

    return {
      domain,
      companyName: companyName.charAt(0).toUpperCase() + companyName.slice(1),
      handle,
    }
  } catch {
    throw new Error('Invalid website URL')
  }
}

/**
 * Generate contact email from domain
 */
export function generateContactEmail(domain: string): string {
  return `contact@${domain}`
}

/**
 * Validate if a handle meets basic requirements
 */
export function isValidHandle(handle: string): boolean {
  if (!handle || handle.trim() === '') {
    return false
  }

  // Check basic pattern: lowercase letters, numbers, and hyphens/underscores
  const validPattern = /^[a-z0-9._-]+$/
  if (!validPattern.test(handle)) {
    return false
  }

  // Can't start or end with separators
  if (handle.startsWith('-') || handle.startsWith('_') || handle.endsWith('-') || handle.endsWith('_')) {
    return false
  }

  // Can't have consecutive separators
  if (
    handle.includes('--') ||
    handle.includes('__') ||
    handle.includes('.-') ||
    handle.includes('-.') ||
    handle.includes('_.') ||
    handle.includes('._')
  ) {
    return false
  }

  return true
}

/**
 * Suggest alternative handles when a handle is taken
 */
export function suggestAlternativeHandles(baseHandle: string, count: number = 3): string[] {
  const suggestions: string[] = []

  for (let i = 1; i <= count; i++) {
    suggestions.push(`${baseHandle}${i}`)
    suggestions.push(`${baseHandle}-${i}`)

    // Add year suffix for variety
    const currentYear = new Date().getFullYear()
    suggestions.push(`${baseHandle}${currentYear}`)
  }

  return suggestions.slice(0, count)
}

// Re-export the main function with a shorter name for convenience
export const generateHandleFromName = generateHandle
export const generateHandleFromEmail = generateEmailHandle
