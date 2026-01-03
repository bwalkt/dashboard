/**
 * Cryptographically secure random number generation
 * Uses Node.js crypto in Node.js, Web Crypto API in browsers
 */

export function getRandomInt(min: number, max: number): number {
  if (min > max) {
    throw new Error('min cannot be greater than max')
  }

  if (min === max) {
    return min
  }

  // Node.js environment - use crypto.randomInt()
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const crypto = require('crypto')
      return crypto.randomInt(min, max + 1) // max is exclusive in randomInt
    } catch (e) {
      // Fall through to Web Crypto API
    }
  }

  // Browser/Worker environment
  const crypto =
    globalThis.crypto ||
    (typeof self !== 'undefined' ? self?.crypto : null) ||
    (typeof window !== 'undefined' ? window.crypto : null)

  if (crypto && crypto.getRandomValues) {
    const range = max - min + 1
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    const randomValue = array[0]
    const maxValidValue = Math.floor(0x100000000 / range) * range - 1

    if (randomValue <= maxValidValue) {
      return min + (randomValue % range)
    }

    // Reject and try again (rare case)
    return getRandomInt(min, max)
  }

  // Fallback (NOT cryptographically secure)
  console.warn('Secure crypto not available, falling back to Math.random()')
  return Math.floor(Math.random() * (max - min + 1)) + min
}
