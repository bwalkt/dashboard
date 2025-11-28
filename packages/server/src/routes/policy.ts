import type { FastifyInstance } from 'fastify'
import { privacyPolicyData } from '../data/policy.js'
import { formatDataToSections, PRIVACY_TITLE_MAPPING } from '../utils/content-formatter.js'

export function policyRoutes(fastify: FastifyInstance) {
  // Privacy Policy endpoint
  fastify.get('/privacy', (request, reply) => {
    try {
      // Format the privacy data into sections using the common utility
      const formattedPrivacy = formatDataToSections(privacyPolicyData, PRIVACY_TITLE_MAPPING)
      
      return reply.code(200).send(formattedPrivacy)
    } catch (error) {
      fastify.log.error({ err: error }, "Error fetching privacy policy:")
      return reply.code(500).send({ error: "Failed to fetch privacy policy" })
    }
  })
}