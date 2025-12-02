import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
console.log({ REDIS_URL })
// Create singleton Redis client
const redis = new Redis(REDIS_URL, {
  retryStrategy: (times: number) => {
    if (times > 3) {
      console.error('Failed to connect to Redis after 3 retries')
      process.exit(1)
    }
    return Math.min(times * 200, 2000)
  },
  maxRetriesPerRequest: 3,
})

redis.on('error', (err: Error) => {
  console.error('Redis connection error:', err)
  process.exit(1)
})

redis.on('connect', () => {
  console.log(`Connected to Redis at ${REDIS_URL}`)
})

/**
 * Store a challenge in Redis with TTL
 */
export async function storeChallenge(id: string, expected: string | number, ttlSeconds: number): Promise<void> {
  const key = `challenge:${id}`
  await redis.setex(key, ttlSeconds, String(expected))
}

/**
 * Refresh/update a challenge's TTL without changing the expected answer
 */
export async function refreshChallengeTTL(id: string, ttlSeconds: number): Promise<boolean> {
  const key = `challenge:${id}`
  const exists = await redis.exists(key)
  if (exists) {
    await redis.expire(key, ttlSeconds)
    return true
  }
  return false
}

/**
 * Get the expected answer for a challenge ID
 */
export async function getExpectedAnswer(id: string): Promise<string | null> {
  const key = `challenge:${id}`
  return await redis.get(key)
}

/**
 * Delete a challenge from Redis
 */
export async function deleteChallenge(id: string): Promise<void> {
  const key = `challenge:${id}`
  await redis.del(key)
}

export default redis
