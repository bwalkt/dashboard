import cors from '@fastify/cors'
import { createHash } from 'crypto'
import Fastify from 'fastify'
import { uuid } from '@pzero/shared/uuid'
import { getExpectedAnswer, refreshChallengeTTL, storeChallenge } from './redis.js'
import type {
  AuthzResponse,
  ChallengeResponse,
  RefreshChallengeResponse,
  ValidateRequest,
  ValidateResponse,
} from './types.js'
import { verifyChallenge } from './verifyChallenge.js'

const PORT = parseInt(process.env.PORT || '3000', 10)
const CHALLENGE_SECRET = process.env.CHALLENGE_SECRET || 'default-secret-change-in-production'
const CHALLENGE_TTL = parseInt(process.env.CHALLENGE_TTL || '3600', 10) // 1 hour default

const fastify = Fastify({
  logger: true,
})

/**
 * Generate a hash-based challenge that the client can solve programmatically
 * Client needs to compute: SHA256(challengeId + CHALLENGE_SECRET)
 */
function generateChallenge(): { challengeId: string; challenge: string; expectedAnswer: string } {
  const challengeId = uuid()
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
     * OPTIONS / (root path)
     * Handle CORS preflight requests from Envoy - always allow
     */
    fastify.options('/', async (_request, reply) => {
      return reply.code(200).send({ ok: true })
    })

    /**
     * POST / (root path)
     * Envoy calls this endpoint to validate requests
     * Envoy sends a POST request with CheckRequest JSON in the body
     * The CheckRequest contains the original request headers
     */
    fastify.post<{ Headers: Record<string, string | undefined>; Body?: any }>(
      '/',
      async (request, reply): Promise<AuthzResponse> => {
        // Envoy sends CheckRequest with original request headers
        // Headers can be in the request body (CheckRequest.attributes.request.http.headers)
        // or forwarded as HTTP headers (if allowed_headers is configured)
        let headers = request.headers

        // Try to extract headers from CheckRequest body if present
        if (request.body && typeof request.body === 'object') {
          const body = request.body as any
          // CheckRequest structure: { attributes: { request: { http: { headers: {...} } } } }
          if (body.attributes?.request?.http?.headers) {
            // Merge body headers with request headers (body headers take precedence)
            headers = { ...headers, ...body.attributes.request.http.headers }
          }
        }

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
     * POST /authz
     * Keep this for backward compatibility or direct calls
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
     * POST /validate
     * Lightweight endpoint for WASM filter to validate challenges
     * Accepts challengeId and challengeAnswer in request body or headers
     * Returns expectedAnswer if valid for WASM to cache in shared data
     */
    fastify.post<{ Body?: ValidateRequest; Headers: Record<string, string | undefined> }>(
      '/validate',
      async (request, reply): Promise<ValidateResponse> => {
        // Extract challenge from body or headers
        let challengeId: string | undefined
        let challengeAnswer: string | undefined

        if (request.body && typeof request.body === 'object') {
          const body = request.body as ValidateRequest
          challengeId = body.challengeId
          challengeAnswer = body.challengeAnswer
        }

        // Fallback to headers if not in body
        if (!challengeId || !challengeAnswer) {
          challengeId = request.headers['x-challenge-id'] as string | undefined
          challengeAnswer = request.headers['x-challenge-answer'] as string | undefined
        }

        // Validate format
        if (!challengeId || !challengeAnswer || !challengeId.length || !challengeAnswer.length) {
          return reply.code(400).send({
            ok: false,
            message: 'Missing required fields: challengeId and challengeAnswer',
          })
        }

        // Verify challenge
        const headers: Record<string, string> = {
          'x-challenge-id': challengeId,
          'x-challenge-answer': challengeAnswer,
        }
        const result = await verifyChallenge(headers)

        if (result.ok) {
          // Get expected answer from Redis to return for caching
          const expectedAnswer = await getExpectedAnswer(challengeId)
          return reply.code(200).send({
            ok: true,
            expectedAnswer: expectedAnswer || undefined,
          })
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

    /**
     * Catch-all handler for any unmatched routes
     * Handle requests that don't match specific routes (e.g., if Envoy forwards original requests)
     * Extract challenge headers and validate them
     */
    fastify.setNotFoundHandler(async (request, reply) => {
      const headers = request.headers

      // Try to validate challenge if headers are present
      if (headers['x-challenge-id'] && headers['x-challenge-answer']) {
        const result = await verifyChallenge(headers)

        if (result.ok) {
          return reply.code(200).send({ ok: true })
        }

        return reply.code(403).send({
          ok: false,
          message: result.reason || 'invalid challenge',
        })
      }

      // No challenge headers - return 404
      return reply.code(404).send({
        error: 'Route not found',
        method: request.method,
        path: request.url,
      })
    })

    await fastify.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`Authz service listening on port ${PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
