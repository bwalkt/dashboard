import type { FastifyInstance } from 'fastify'

const privacyPolicyData = {
  last_updated: '2025-01-01',
  company_name: 'Your Cybersecurity Company Name',
  overview:
    'We are committed to protecting your privacy and securing your data. This Privacy Policy explains what information we collect, how we use it, and the rights you have regarding your personal information.',

  information_we_collect: {
    personal_information: [
      'Name',
      'Email address',
      'Phone number',
      'Billing and payment details',
    ],
    technical_information: ['IP address', 'Device identifiers', 'Browser type', 'Usage logs', 'Authentication metadata'],
    sensitive_security_information: [
      'Threat intelligence data provided to us',
      'Security event logs',
      'Anonymized behavioral analytics',
    ],
  },
  how_we_use_information: {
    service_delivery: [
      'Authenticate users',
      'Provide passwordless or identity-based security services',
      'Process transactions',
      'Maintain and improve platform security',
    ],
    analytics: ['Monitor system performance', 'Detect and prevent fraud or cyber threats', 'Improve product features'],
    communications: ['Customer support', 'Security alerts', 'Product updates'],
    legal_compliance: ['Meet legal obligations', 'Respond to law enforcement requests'],
  },

  legal_basis_for_processing: {
    eu_gdpr: ['Consent', 'Performance of a contract', 'Legitimate interests', 'Compliance with legal obligations'],
  },

  data_sharing: {
    third_parties: ['Cloud hosting providers', 'Payment processors', 'Security analytics partners'],
    conditions:
      'We do not sell personal information. Data is shared only with trusted partners under strict confidentiality agreements.',
  },

  data_retention: {
    policy:
      'We retain personal data only as long as necessary to provide services, meet compliance requirements, or support legitimate business purposes.',
    typical_retention_periods: {
      account_data: 'While account is active + 12 months',
      security_logs: '90–365 days depending on regulatory requirements',
    },
  },

  your_rights: {
    privacy_rights: [
      'Access your data',
      'Correct or update information',
      'Request data deletion',
      'Opt out of certain processing',
      'Receive a copy of your data (data portability)',
    ],
    contact_method: 'privacy@yourcompany.com',
  },

  cookies_and_tracking: {
    types_used: ['Essential cookies', 'Security and authentication cookies', 'Anonymous usage analytics'],
    preferences: 'Users may manage cookie preferences through their browser settings.',
  },
  security_measures: {
    technical_controls: [
      'End-to-end encryption',
      'Zero-trust access controls',
      'Multi-factor authentication',
      'Vulnerability scanning',
      'Security monitoring and incident response',
    ],
    statement: 'While we implement industry-leading safeguards, no method of transmission or storage is completely secure.',
  },

  international_transfers: {
    policy:
      'If transferring data outside your region, we use safeguards such as SCCs, encryption, and compliance reviews.',
  },

  children_privacy: {
    statement: 'Our services are not intended for children under 16, and we do not knowingly collect their data.',
  },

  changes_to_policy: {
    notice: 'We may update this Privacy Policy. Material changes will be communicated via email or platform notification.',
  },

  contact_us: {
    email: 'privacy@yourcompany.com',
    address: '123 Security Ave, Suite 100, City, State, ZIP',
    phone: '+1-555-000-0000',
  },
}

function formatPrivacyPolicyToSections(data: typeof privacyPolicyData) {
  const sections = []

  sections.push({
    title: 'Last Updated',
    content: data.last_updated,
  })

  sections.push({
    title: 'Overview',
    content: data.overview,
  })

  sections.push({
    title: 'Information We Collect',
    content: `Personal Information:\n• ${data.information_we_collect.personal_information.join('\n• ')}\n\nTechnical Information:\n• ${data.information_we_collect.technical_information.join('\n• ')}\n\nSensitive Security Information:\n• ${data.information_we_collect.sensitive_security_information.join('\n• ')}`,
  })

  sections.push({
    title: 'How We Use Information',
    content: `Service Delivery:\n• ${data.how_we_use_information.service_delivery.join('\n• ')}\n\nAnalytics:\n• ${data.how_we_use_information.analytics.join('\n• ')}\n\nCommunications:\n• ${data.how_we_use_information.communications.join('\n• ')}\n\nLegal Compliance:\n• ${data.how_we_use_information.legal_compliance.join('\n• ')}`,
  })

  sections.push({
    title: 'Legal Basis for Processing (GDPR)',
    content: `• ${data.legal_basis_for_processing.eu_gdpr.join('\n• ')}`,
  })

  sections.push({
    title: 'Data Sharing',
    content: `We may share data with:\n• ${data.data_sharing.third_parties.join('\n• ')}\n\n${data.data_sharing.conditions}`,
  })

  sections.push({
    title: 'Data Retention',
    content: `${data.data_retention.policy}\n\nTypical retention periods:\n• Account data: ${data.data_retention.typical_retention_periods.account_data}\n• Security logs: ${data.data_retention.typical_retention_periods.security_logs}`,
  })

  sections.push({
    title: 'Your Rights',
    content: `You have the right to:\n• ${data.your_rights.privacy_rights.join('\n• ')}\n\nContact: ${data.your_rights.contact_method}`,
  })

  sections.push({
    title: 'Cookies and Tracking',
    content: `We use:\n• ${data.cookies_and_tracking.types_used.join('\n• ')}\n\n${data.cookies_and_tracking.preferences}`,
  })

  sections.push({
    title: 'Security Measures',
    content: `We implement industry-leading safeguards:\n• ${data.security_measures.technical_controls.join('\n• ')}\n\n${data.security_measures.statement}`,
  })

  sections.push({
    title: 'International Data Transfers',
    content: data.international_transfers.policy,
  })

  sections.push({
    title: "Children's Privacy",
    content: data.children_privacy.statement,
  })

  sections.push({
    title: 'Changes to This Policy',
    content: data.changes_to_policy.notice,
  })

  sections.push({
    title: 'Contact Us',
    content: `Email: ${data.contact_us.email}\nAddress: ${data.contact_us.address}\nPhone: ${data.contact_us.phone}`,
  })

  return sections
}

export async function policyRoutes(fastify: FastifyInstance) {
  // Privacy Policy endpoint
  fastify.get('/privacy', async (request, reply) => {
    try {
      return reply.code(200).send({
        sections: formatPrivacyPolicyToSections(privacyPolicyData)
      })
    } catch (error) {
      fastify.log.error({ err: error }, "Error fetching privacy policy:")
      return reply.code(500).send({ error: "Failed to fetch privacy policy" })
    }
  })
}