/**
 * Cryptographically secure random number generation for browser environments
 */

/**
 * Generate a cryptographically secure random integer between min and max (inclusive)
 * Uses the Web Crypto API (crypto.getRandomValues) for secure randomness
 */
export function getRandomInt(min: number, max: number): number {
  // Check if crypto API is available
  if (typeof self !== 'undefined' && self.crypto && self.crypto.getRandomValues) {
    // Use self.crypto (works in both window and worker contexts)
  } else if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    // Fallback to window.crypto
  } else {
    throw new Error('Crypto API not found. Secure random number generation is not available.')
  }

  const array = new Uint32Array(1)
  self.crypto.getRandomValues(array)

  // Convert the 32-bit unsigned integer to a 0-1 range decimal
  // 0xffffffff is the maximum value for a Uint32 (4,294,967,295)
  const randomDecimal = array[0] / (0xffffffff + 1)

  // Map that decimal to your desired [min, max] range
  return Math.floor(randomDecimal * (max - min + 1)) + min
}
