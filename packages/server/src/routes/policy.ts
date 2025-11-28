import type { FastifyInstance } from 'fastify'
import { privacyPolicyData } from '../data/policy.js'

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