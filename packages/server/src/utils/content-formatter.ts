/**
 * Utility functions for formatting content data into standardized sections
 */

interface Section {
  title: string
  content: string
}

interface SectionResponse {
  sections: Section[]
}

/**
 * Converts any nested object structure into formatted sections
 * Uses Object.keys to dynamically navigate the structure
 */
export function formatDataToSections(data: any, titleMapping?: Record<string, string>): SectionResponse {
  const sections: Section[] = []

  // Process each key in the data object
  Object.keys(data).forEach(key => {
    const value = data[key]
    const title = titleMapping?.[key] || formatTitle(key)

    if (typeof value === 'string') {
      // Simple string value
      sections.push({
        title,
        content: value
      })
    } else if (Array.isArray(value)) {
      // Array value - convert to bullet points
      sections.push({
        title,
        content: `• ${value.join('\n• ')}`
      })
    } else if (typeof value === 'object' && value !== null) {
      // Nested object - format recursively
      const content = formatNestedObject(value)
      sections.push({
        title,
        content
      })
    }
  })

  return { sections }
}

/**
 * Format nested objects into readable content
 */
function formatNestedObject(obj: any, indent = 0): string {
  const lines: string[] = []
  const prefix = '  '.repeat(indent)

  Object.keys(obj).forEach(key => {
    const value = obj[key]
    const formattedKey = formatTitle(key)

    if (typeof value === 'string') {
      lines.push(`${prefix}${formattedKey}: ${value}`)
    } else if (Array.isArray(value)) {
      lines.push(`${prefix}${formattedKey}:`)
      value.forEach(item => {
        lines.push(`${prefix}• ${item}`)
      })
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${prefix}${formattedKey}:`)
      lines.push(formatNestedObject(value, indent + 1))
    }
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