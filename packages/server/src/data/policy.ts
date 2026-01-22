export const privacyPolicyData = {
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