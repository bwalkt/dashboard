import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import { CHALLENGE_ANSWER_HEADER, CHALLENGE_ID_HEADER, CHALLENGE_QUESTION_HEADER } from '@pzero/shared/challenge'
import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { VALIDATION_HEADER_NAME } from './config/constants.js'
import { config, validateEnvironment } from './config/env.js'
import { authRoutes } from './routes/auth.js'
import { salesforceRoutes } from './routes/salesforce.js'

// Export a function that returns a Fastify instance
export default async function (fastify: FastifyInstance, opts: FastifyPluginOptions): Promise<void> {
  // Validate environment variables
  validateEnvironment()

  // Register CORS plugin
  await fastify.register(cors, {
    origin: true, // Allow all origins in development - you can restrict this in production
    credentials: true, // Allow credentials (cookies, authorization headers)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'x-client-type',
      VALIDATION_HEADER_NAME,
      // Challenge headers for authz-service
      CHALLENGE_ID_HEADER,
      CHALLENGE_ANSWER_HEADER,
      // OpenTelemetry trace context headers for distributed tracing
      'traceparent',
      'tracestate',
    ],
    exposedHeaders: [
      'Content-Range',
      'X-Content-Range',
      VALIDATION_HEADER_NAME,
      // Challenge headers sent in responses
      CHALLENGE_ID_HEADER,
      CHALLENGE_QUESTION_HEADER,
      'timing-allow-origin',
    ],
    maxAge: 86400, // Cache preflight response for 1 day
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })

  // Use the onSend hook to add the Timing-Allow-Origin header
  fastify.addHook('onSend', (request, reply, payload, done) => {
    // Check if the request is a cross-origin request and if a specific origin was allowed
    const origin = request.headers.origin
    const allowedOrigin = config.FRONTEND_URL // Your specific allowed origin

    if (origin && origin === allowedOrigin) {
      reply.header('Timing-Allow-Origin', allowedOrigin)
    }

    // If using a wildcard for Access-Control-Allow-Origin
    // reply.header('Timing-Allow-Origin', '*');

    done()
  })

  // Register cookie plugin for OAuth state management
  await fastify.register(cookie, {
    secret: process.env.JWT_SECRET || 'default-cookie-secret',
  })

  // Console log when server starts
  fastify.addHook('onReady', async () => {})

  // Register authentication routes
  await fastify.register(authRoutes)

  // Register Salesforce routes
  await fastify.register(salesforceRoutes)
}
