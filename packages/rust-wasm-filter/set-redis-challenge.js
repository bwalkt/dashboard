const path = require('path')
const fs = require('fs')

// Check if server is built
const redisConfigPath = path.resolve(__dirname, '../server/dist/config/redis.js')
if (!fs.existsSync(redisConfigPath)) {
  console.error('Error: Server not built. Run `pnpm build` in packages/server first.')
  process.exit(1)
}

const { redis } = require(redisConfigPath)

async function main() {
  const challengeId = process.argv[2] || '1'
  const answer = process.argv[3] || '1'
  const key = `challenge:${challengeId}`

  await redis.initialize()
  await redis.set(key, answer)
  console.log(`Set ${key}=${answer}`)
  const val = await redis.get(key)
  console.log('Verified:', val)
  await redis.close()
  process.exit(0)
}

main().catch(console.error)
