import Fastify from 'fastify'
import { db } from './config/database.js'
import { redis } from './config/redis.js'
import app from './index.js'

const fastify = Fastify({
  logger: {
    level: 'info',
  },
})

// Register the plugin
await fastify.register(app)

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`)
  try {
    await fastify.close()
    await db.close()
    await redis.close()
    console.log('Database and Redis connections closed')
    console.log('Server closed successfully')
    process.exit(0)
  } catch (err) {
    console.error('Error during graceful shutdown:', err)
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

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
