import cors from '@fastify/cors'
import { createHash } from 'crypto'
import Fastify from 'fastify'
import { nanoid } from 'nanoid'
import { refreshChallengeTTL, storeChallenge } from './redis.js'
import type { AuthzResponse, ChallengeResponse, RefreshChallengeResponse } from './types.js'
import { verifyChallenge } from './verifyChallenge.js'

const PORT = parseInt(process.env.PORT || '3000', 10)
const CHALLENGE_SECRET = process.env.CHALLENGE_SECRET || 'default-secret-change-in-production'
const CHALLENGE_TTL = parseInt(process.env.CHALLENGE_TTL || '300', 10) // 5 minutes default

const fastify = Fastify({
  logger: true,
})

/**
 * Generate a hash-based challenge that the client can solve programmatically
 * Client needs to compute: SHA256(challengeId + CHALLENGE_SECRET)
 */
function generateChallenge(): { challengeId: string; challenge: string; expectedAnswer: string } {
  const challengeId = nanoid()
  const expectedAnswer = createHash('sha256')
    .update(challengeId + CHALLENGE_SECRET)
    .digest('hex')

  return {
    challengeId,
    challenge: `SHA256(${challengeId} + secret)`, // Instruction for client
    expectedAnswer,
  }
}

// Start server
const start = async (): Promise<void> => {
  try {
    // Register CORS plugin before routes (must be awaited)
    await fastify.register(cors, {
      origin: true, // Allow all origins - adjust in production
      credentials: true, // Allow credentials (cookies, authorization headers)
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-challenge-id', 'x-challenge-answer', 'x-challenge'],
      exposedHeaders: ['x-challenge-id', 'x-challenge'],
      maxAge: 86400, // Cache preflight response for 1 day
      preflightContinue: false,
      optionsSuccessStatus: 204,
    })

    /**
     * OPTIONS /authz
     * Handle CORS preflight requests - always allow
     */
    fastify.options('/authz', async (_request, reply) => {
      return reply.code(200).send({ ok: true })
    })

    /**
     * POST /authz
     * Envoy calls this endpoint to validate requests
     */
    fastify.post<{ Headers: Record<string, string | undefined> }>(
      '/authz',
      async (request, reply): Promise<AuthzResponse> => {
        const headers = request.headers

        const result = await verifyChallenge(headers)

        if (result.ok) {
          return reply.code(200).send({ ok: true })
        }

        return reply.code(403).send({
          ok: false,
          message: result.reason || 'invalid challenge',
        })
      },
    )

    /**
     * POST /issue-challenge
     * Used by the application during login to generate a challenge
     * Client solves this programmatically by computing SHA256(challengeId + secret)
     */
    fastify.post(
      '/issue-challenge',
      {
        schema: {
          body: {
            type: 'object',
            properties: {},
            additionalProperties: true,
          },
        },
      },
      async (_request, reply): Promise<ChallengeResponse> => {
        const { challengeId, challenge, expectedAnswer } = generateChallenge()

        // Store expected answer in Redis with TTL
        await storeChallenge(challengeId, expectedAnswer, CHALLENGE_TTL)

        return reply.code(200).send({
          challengeId,
          challenge,
        })
      },
    )

    /**
     * POST /refresh-challenge
     * Called when JWT is refreshed to get a new challenge
     * This invalidates the old challenge and issues a new one
     */
    fastify.post<{ Body: { challengeId?: string } }>(
      '/refresh-challenge',
      async (request, reply): Promise<RefreshChallengeResponse> => {
        const oldChallengeId = (request.body as { challengeId?: string })?.challengeId

        // If old challenge exists, try to refresh its TTL (optional - can also just issue new)
        if (oldChallengeId) {
          await refreshChallengeTTL(oldChallengeId, CHALLENGE_TTL)
        }

        // Generate new challenge
        const { challengeId, challenge, expectedAnswer } = generateChallenge()

        // Store expected answer in Redis with TTL
        await storeChallenge(challengeId, expectedAnswer, CHALLENGE_TTL)

        return reply.code(200).send({
          challengeId,
          challenge,
        })
      },
    )

    /**
     * Health check endpoint
     */
    fastify.get('/health', async (_request, reply) => {
      return reply.code(200).send({ status: 'ok' })
    })

    await fastify.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`Authz service listening on port ${PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
