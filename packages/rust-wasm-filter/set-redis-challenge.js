const { redis } = require('../server/dist/config/redis.js')

/**
 * Initialize the Redis client, set 'challenge:1' to '1', verify the stored value, log the actions, and terminate the process.
 *
 * This function does not handle errors locally; any thrown errors will propagate to the caller. It exits the Node.js process with code 0 after verification.
 */
async function main() {
  await redis.initialize()
  await redis.set('challenge:1', '1')
  console.log('Set challenge:1=1')
  const val = await redis.get('challenge:1')
  console.log('Verified:', val)
  process.exit(0)
}

main().catch(console.error)