/**
 * Utility functions for formatting content data into standardized sections
 */

import type { Section, SectionResponse } from '@pzero/shared/pzero'

/**
 * Converts any nested object structure into formatted sections
 * Uses Object.keys to dynamically navigate the structure
 */
export function formatDataToSections(data: unknown, titleMapping?: Record<string, string>): SectionResponse {
  // Input validation
  if (data === null || data === undefined) {
    return { sections: [] }
  }
  
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('formatDataToSections expects a non-array object as input')
  }

  const sections: Section[] = []
  const dataObj = data as Record<string, unknown>

  // Process each key in the data object
  Object.keys(dataObj).forEach(key => {
    const value = dataObj[key]
    const title = titleMapping?.[key] || formatTitle(key)

    if (typeof value === 'string') {
      // Simple string value
      sections.push({
        title,
        content: value
      })
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      // Convert primitives to strings
      sections.push({
        title,
        content: String(value)
      })
    } else if (Array.isArray(value)) {
      // Array value - convert to bullet points, handling mixed types
      if (value.length === 0) {
        // Skip empty arrays to avoid lone bullet character
        return
      }
      const stringItems = value.map(item => 
        typeof item === 'string' ? item : String(item)
      )
      sections.push({
        title,
        content: `• ${stringItems.join('\n• ')}`
      })
    } else if (typeof value === 'object' && value !== null) {
      // Nested object - format recursively
      const content = formatNestedObject(value)
      sections.push({
        title,
        content
      })
    }
    // Skip undefined, null, and function values
  })

  return { sections }
}

/**
 * Format nested objects into readable content
 */
function formatNestedObject(obj: unknown, indent = 0): string {
  if (obj === null || obj === undefined) {
    return ''
  }
  
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return String(obj)
  }

  const lines: string[] = []
  const prefix = '  '.repeat(indent)
  const objRecord = obj as Record<string, unknown>

  Object.keys(objRecord).forEach(key => {
    const value = objRecord[key]
    const formattedKey = formatTitle(key)

    if (typeof value === 'string') {
      lines.push(`${prefix}${formattedKey}: ${value}`)
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      lines.push(`${prefix}${formattedKey}: ${String(value)}`)
    } else if (Array.isArray(value)) {
      lines.push(`${prefix}${formattedKey}:`)
      value.forEach(item => {
        const stringItem = typeof item === 'string' ? item : String(item)
        lines.push(`${prefix}• ${stringItem}`)
      })
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${prefix}${formattedKey}:`)
      lines.push(formatNestedObject(value, indent + 1))
    }
    // Skip undefined, null, and function values
  })

  return lines.join('\n')
}

/**
 * Convert snake_case or camelCase keys to readable titles
 */
function formatTitle(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, c => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Predefined title mappings for common keys
 */
export const TERMS_TITLE_MAPPING: Record<string, string> = {
  last_updated: 'Last Updated',
  introduction: 'Introduction',
  definitions: 'Definitions',
  use_of_services: 'Use of Services',
  account_requirements: 'Account Requirements',
  intellectual_property: 'Intellectual Property',
  payment_and_billing: 'Payment and Billing',
  privacy: 'Privacy',
  limitations_of_liability: 'Limitations of Liability',
  indemnification: 'Indemnification',
  termination: 'Termination',
  governing_law: 'Governing Law',
  changes_to_terms: 'Changes to Terms',
  contact_information: 'Contact Information'
}

export const PRIVACY_TITLE_MAPPING: Record<string, string> = {
  last_updated: 'Last Updated',
  company_name: 'Company Name',
  overview: 'Overview',
  information_we_collect: 'Information We Collect',
  how_we_use_information: 'How We Use Information',
  legal_basis_for_processing: 'Legal Basis for Processing (GDPR)',
  data_sharing: 'Data Sharing',
  data_retention: 'Data Retention',
  your_rights: 'Your Rights',
  cookies_and_tracking: 'Cookies and Tracking',
  security_measures: 'Security Measures',
  international_transfers: 'International Data Transfers',
  children_privacy: "Children's Privacy",
  changes_to_policy: 'Changes to This Policy',
  contact_us: 'Contact Us'
}