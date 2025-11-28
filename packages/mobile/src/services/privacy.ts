import { api } from '@pzero/shared/api'

export interface PrivacyPolicyData {
  last_updated: string
  company_name: string
  overview: string
  information_we_collect: {
    personal_information: string[]
    technical_information: string[]
    sensitive_security_information: string[]
  }
  how_we_use_information: {
    service_delivery: string[]
    analytics: string[]
    communications: string[]
    legal_compliance: string[]
  }
  legal_basis_for_processing: {
    eu_gdpr: string[]
  }
  data_sharing: {
    third_parties: string[]
    conditions: string
  }
  data_retention: {
    policy: string
    typical_retention_periods: {
      account_data: string
      security_logs: string
    }
  }
  your_rights: {
    privacy_rights: string[]
    contact_method: string
  }
  cookies_and_tracking: {
    types_used: string[]
    preferences: string
  }
  security_measures: {
    technical_controls: string[]
    statement: string
  }
  international_transfers: {
    policy: string
  }
  children_privacy: {
    statement: string
  }
  changes_to_policy: {
    notice: string
  }
  contact_us: {
    email: string
    address: string
    phone: string
  }
}


export interface PrivacySection {
  title: string
  content: string
}

export interface PrivacyResponse {
  sections: PrivacySection[]
}

const formatPrivacyPolicyToSections = (data: PrivacyPolicyData): PrivacySection[] => {
  const sections: PrivacySection[] = []

  sections.push({
    title: 'Last Updated',
    content: data.last_updated,
  })

  sections.push({
    title: 'Overview',
    content: data.overview,
  })

  sections.push({
    title: '1. Information We Collect',
    content: `Personal Information:\n• ${data.information_we_collect.personal_information.join('\n• ')}\n\nTechnical Information:\n• ${data.information_we_collect.technical_information.join('\n• ')}\n\nSensitive Security Information:\n• ${data.information_we_collect.sensitive_security_information.join('\n• ')}`,
  })

  sections.push({
    title: '2. How We Use Information',
    content: `Service Delivery:\n• ${data.how_we_use_information.service_delivery.join('\n• ')}\n\nAnalytics:\n• ${data.how_we_use_information.analytics.join('\n• ')}\n\nCommunications:\n• ${data.how_we_use_information.communications.join('\n• ')}\n\nLegal Compliance:\n• ${data.how_we_use_information.legal_compliance.join('\n• ')}`,
  })

  sections.push({
    title: '3. Legal Basis for Processing (GDPR)',
    content: `• ${data.legal_basis_for_processing.eu_gdpr.join('\n• ')}`,
  })

  sections.push({
    title: '4. Data Sharing',
    content: `We may share data with:\n• ${data.data_sharing.third_parties.join('\n• ')}\n\n${data.data_sharing.conditions}`,
  })

  sections.push({
    title: '5. Data Retention',
    content: `${data.data_retention.policy}\n\nTypical retention periods:\n• Account data: ${data.data_retention.typical_retention_periods.account_data}\n• Security logs: ${data.data_retention.typical_retention_periods.security_logs}`,
  })

  sections.push({
    title: '6. Your Rights',
    content: `You have the right to:\n• ${data.your_rights.privacy_rights.join('\n• ')}\n\nContact: ${data.your_rights.contact_method}`,
  })

  sections.push({
    title: '7. Cookies and Tracking',
    content: `We use:\n• ${data.cookies_and_tracking.types_used.join('\n• ')}\n\n${data.cookies_and_tracking.preferences}`,
  })

  sections.push({
    title: '8. Security Measures',
    content: `We implement industry-leading safeguards:\n• ${data.security_measures.technical_controls.join('\n• ')}\n\n${data.security_measures.statement}`,
  })

  sections.push({
    title: '9. International Data Transfers',
    content: data.international_transfers.policy,
  })

  sections.push({
    title: '10. Children\'s Privacy',
    content: data.children_privacy.statement,
  })

  sections.push({
    title: '11. Changes to This Policy',
    content: data.changes_to_policy.notice,
  })

  sections.push({
    title: '12. Contact Us',
    content: `Email: ${data.contact_us.email}\nAddress: ${data.contact_us.address}\nPhone: ${data.contact_us.phone}`,
  })

  return sections
}

export const fetchPrivacyPolicy = async (): Promise<PrivacyResponse> => {
  console.log('Attempting to fetch privacy policy from /privacy-policy endpoint...')
  const response = await api.get('/privacy-policy')
  console.log('Privacy Policy API response:', response)

  // If response is already structured with sections, return it
  if (response && response.sections && Array.isArray(response.sections)) {
    return response
  }

  // If response is the JSON format you provided, format it into sections
  if (response && typeof response === 'object' && 'last_updated' in response) {
    return { sections: formatPrivacyPolicyToSections(response as PrivacyPolicyData) }
  }

  // If response is invalid, throw error
  throw new Error('Invalid privacy policy response from server')
}