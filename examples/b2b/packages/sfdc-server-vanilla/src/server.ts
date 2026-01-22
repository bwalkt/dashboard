import Fastify from 'fastify'
import { shutdownOpenTelemetry, startOpenTelemetry } from './config/otel.js'
import app from './index.js'

// Initialize OpenTelemetry SDK before creating Fastify instance
// This ensures all instrumentation is set up correctly
startOpenTelemetry()

const fastify = Fastify({
  logger: {
    level: 'info',
  },
})

// Register the plugin
await fastify.register(app)

// Start the server
try {
  const port = parseInt(process.env.PORT || '8080', 10)
  await fastify.listen({ port, host: '0.0.0.0' })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}

// Graceful shutdown handler for OpenTelemetry
const gracefulShutdown = async (signal: NodeJS.Signals) => {
  fastify.log.info({ signal }, 'Starting graceful shutdown')
  try {
    await fastify.close()
    await shutdownOpenTelemetry()
    fastify.log.info('Server and OpenTelemetry closed successfully')
    process.exit(0)
  } catch (err) {
    fastify.log.error({ err }, 'Error during graceful shutdown')
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
