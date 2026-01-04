/**
 * Cryptographically secure random number generation and encryption utilities
 */

interface EncryptedData {
  encrypted: string
  iv: string
  authTag: string
}

/**
 * Decrypt data encrypted with AES-256-GCM
 * Works in both Node.js and browser environments
 */
export async function decrypt(encryptedData: EncryptedData | string, secret: string): Promise<any> {
  const data = typeof encryptedData === 'string' ? JSON.parse(encryptedData) : encryptedData

  // Node.js environment
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const crypto = await import('crypto')

      // Create key from secret
      const secretKey = crypto.createHash('sha256').update(String(secret)).digest()

      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey, Buffer.from(data.iv, 'hex'))

      // Set the authentication tag
      decipher.setAuthTag(Buffer.from(data.authTag, 'hex'))

      // Decrypt the data
      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      // Try to parse as JSON, otherwise return as string
      try {
        return JSON.parse(decrypted)
      } catch {
        return decrypted
      }
    } catch (error) {
      console.error('Decryption error:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  // Browser environment - use Web Crypto API
  const crypto = globalThis.crypto || self?.crypto || (typeof window !== 'undefined' ? window.crypto : null)

  if (crypto && crypto.subtle) {
    try {
      // Create key from secret
      const encoder = new TextEncoder()
      const keyData = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
      const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['decrypt'])

      // Convert hex to buffer
      const hexToBuffer = (hex: string): Uint8Array => {
        const bytes = new Uint8Array(hex.length / 2)
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
        }
        return bytes
      }

      // Prepare decryption parameters
      const iv = hexToBuffer(data.iv)
      const authTag = hexToBuffer(data.authTag)
      const ciphertext = hexToBuffer(data.encrypted)

      // Combine ciphertext and authTag for Web Crypto API
      const combinedBuffer = new ArrayBuffer(ciphertext.length + authTag.length)
      const combined = new Uint8Array(combinedBuffer)
      combined.set(ciphertext, 0)
      combined.set(authTag, ciphertext.length)

      // Decrypt
      // @ts-ignore - TypeScript has issues with ArrayBufferLike vs ArrayBuffer
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, combinedBuffer)

      // Convert to string and parse JSON
      const decoder = new TextDecoder()
      const jsonString = decoder.decode(decrypted)

      try {
        return JSON.parse(jsonString)
      } catch {
        return jsonString
      }
    } catch (error) {
      console.error('Decryption error:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  throw new Error('Crypto API not available')
}

/**
 * Encrypt data with AES-256-GCM
 * Works in both Node.js and browser environments
 */
export async function encrypt(data: any, secret: string): Promise<string> {
  const text = typeof data === 'string' ? data : JSON.stringify(data)

  // Node.js environment
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const crypto = await import('crypto')

      // Create key from secret
      const secretKey = crypto.createHash('sha256').update(String(secret)).digest()

      // Generate IV
      const iv = crypto.randomBytes(16)

      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-gcm', secretKey, iv)

      // Encrypt the data
      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      // Get the authentication tag
      const authTag = cipher.getAuthTag()

      const result: EncryptedData = {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      }

      return JSON.stringify(result)
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  // Browser environment - use Web Crypto API
  const crypto = globalThis.crypto || self?.crypto || (typeof window !== 'undefined' ? window.crypto : null)

  if (crypto && crypto.subtle) {
    try {
      // Create key from secret
      const encoder = new TextEncoder()
      const keyData = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
      const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt'])

      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(16))

      // Encrypt
      const plaintext = encoder.encode(text)
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)

      // Split ciphertext and authTag
      const ciphertext = new Uint8Array(encrypted, 0, encrypted.byteLength - 16)
      const authTag = new Uint8Array(encrypted, encrypted.byteLength - 16)

      // Convert buffer to hex
      const bufferToHex = (buffer: Uint8Array): string => {
        return Array.from(buffer)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      }

      const result: EncryptedData = {
        encrypted: bufferToHex(ciphertext),
        iv: bufferToHex(iv),
        authTag: bufferToHex(authTag),
      }

      return JSON.stringify(result)
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  throw new Error('Crypto API not available')
}

/**
 * Encrypt grid data specifically
 */
export async function encryptGrid(grid: number[][], secret: string): Promise<string> {
  return encrypt(grid, secret)
}

/**
 * Decrypt grid data specifically
 */
export async function decryptGrid(encryptedGrid: string, secret: string): Promise<number[][]> {
  return decrypt(encryptedGrid, secret)
}

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
  const crypto = globalThis.crypto || self?.crypto || (typeof window !== 'undefined' ? window.crypto : null)

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
