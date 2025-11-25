import Redis from 'ioredis'
import { config } from './env'

class RedisManager {
  private client: Redis
  private initialized: boolean = false

  constructor() {
    this.client = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      reconnectOnError: (err: Error) => {
        const targetError = 'READONLY'
        if (err.message?.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true
        }
        return false
      },
    })

    // Handle connection events
    this.client.on('connect', () => {
      console.log('✅ Redis client connected')
    })

    this.client.on('error', (err: Error) => {
      console.error('❌ Redis client error:', err)
    })

    this.client.on('close', () => {
      console.log('Redis client connection closed')
      this.initialized = false
    })
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      await this.client.ping()
      console.log('✅ Redis initialized successfully')
      this.initialized = true
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error)
      throw error
    }
  }

  public getClient(): Redis {
    return this.client
  }

  public async close(): Promise<void> {
    await this.client.quit()
  }

  // Helper methods for common operations
  public async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  public async set(key: string, value: string, expirationSeconds?: number): Promise<void> {
    if (expirationSeconds) {
      await this.client.setex(key, expirationSeconds, value)
    } else {
      await this.client.set(key, value)
    }
  }

  public async delete(key: string): Promise<void> {
    await this.client.del(key)
  }

  public async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key)
    return result === 1
  }

  public async ttl(key: string): Promise<number> {
    return this.client.ttl(key)
  }
}

// Export singleton instance
export const redis = new RedisManager()
