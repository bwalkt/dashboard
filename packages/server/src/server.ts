import Fastify from 'fastify'
import { db } from './config/database'
import { redis } from './config/redis'
import app from './index'

const fastify = Fastify({
  logger: {
    level: 'info',
  },
})

// Register the plugin
await fastify.register(app)

let shuttingDown = false
const gracefulShutdown = async (signal: NodeJS.Signals) => {
  if (shuttingDown) return
  shuttingDown = true
  fastify.log.info({ signal }, 'Starting graceful shutdown')
  try {
    await fastify.close() // triggers onClose hooks to clean up db/redis
    fastify.log.info('Server closed successfully')
    process.exit(0)
  } catch (err) {
    fastify.log.error({ err }, 'Error during graceful shutdown')
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown)
process.on('SIGINT', () => gracefulShutdown)

// Start the server
try {
  const port = parseInt(process.env.PORT || '8080', 10)
  await fastify.listen({ port, host: '0.0.0.0' })
} catch (err) {
  fastify.log.error(err)
  await db.close()
  await redis.close()
  process.exit(1)
}
