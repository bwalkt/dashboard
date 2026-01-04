const { redis } = require('../server/dist/config/redis.js')

async function main() {
  await redis.initialize()
  await redis.set('challenge:1', '1')
  console.log('Set challenge:1=1')
  const val = await redis.get('challenge:1')
  console.log('Verified:', val)
  process.exit(0)
}

main().catch(console.error)
