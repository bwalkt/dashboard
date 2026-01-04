/**
 * Simple grid generation, encryption, and decryption utilities
 */

import { decrypt as decryptData } from '../utils/crypto.js'

interface EncryptedGrid {
  encrypted: string
  iv: string
  authTag: string
}

/**
 * Generate a simple random grid of numbers
 * @param rows - Number of rows (default: 5)
 * @param cols - Number of columns (default: 5)
 * @param min - Minimum value (inclusive, default: 0)
 * @param max - Maximum value (inclusive, default: 9)
 * @returns 2D array of numbers
 */
export function genGrid(rows = 5, cols = 5, min = 0, max = 9): number[][] {
  const grid: number[][] = []
  for (let i = 0; i < rows; i++) {
    const row: number[] = []
    for (let j = 0; j < cols; j++) {
      row.push(Math.floor(Math.random() * (max - min + 1)) + min)
    }
    grid.push(row)
  }
  return grid
}

/**
 * Encrypt a grid using AES-256-GCM
 * @param grid - 2D array of numbers to encrypt
 * @param secret - Secret key for encryption
 * @returns Encrypted grid data
 */
export async function encryptGrid(grid: number[][], secret: string): Promise<EncryptedGrid> {
  const gridString = JSON.stringify(grid)

  // Node.js environment
  if (typeof process !== 'undefined' && process.versions?.node) {
    const crypto = await import('crypto')

    // Create key from secret
    const secretKey = crypto.createHash('sha256').update(String(secret)).digest()

    // Generate random IV
    const iv = crypto.randomBytes(16)

    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', secretKey, iv)

    // Encrypt the grid
    let encrypted = cipher.update(gridString, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    // Get the authentication tag
    const authTag = cipher.getAuthTag()

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    }
  }

  // Browser environment
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder()

    // Create key from secret
    const keyData = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt'])

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(16))

    // Encrypt
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(gridString))

    const encryptedArray = new Uint8Array(encrypted)

    // Split ciphertext and auth tag (last 16 bytes)
    const ciphertext = encryptedArray.slice(0, -16)
    const authTag = encryptedArray.slice(-16)

    // Convert to hex
    const bufferToHex = (buffer: Uint8Array): string => {
      return Array.from(buffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    }

    return {
      encrypted: bufferToHex(ciphertext),
      iv: bufferToHex(iv),
      authTag: bufferToHex(authTag),
    }
  }

  throw new Error('No suitable crypto implementation available')
}

/**
 * Decrypt an encrypted grid
 * @param encryptedGrid - Encrypted grid data
 * @param secret - Secret key for decryption
 * @returns Decrypted 2D array of numbers
 */
export async function decryptGrid(encryptedGrid: EncryptedGrid | string, secret: string): Promise<number[][]> {
  const decrypted = await decryptData(encryptedGrid, secret)

  if (!Array.isArray(decrypted) || (decrypted.length > 0 && !Array.isArray(decrypted[0]))) {
    throw new Error('Decrypted data is not a valid grid')
  }

  return decrypted as number[][]
}

/**
 * Check if two grids are equal
 * @param grid1 - First grid
 * @param grid2 - Second grid
 * @returns True if grids are equal, false otherwise
 */
export function gridsEqual(grid1: number[][], grid2: number[][]): boolean {
  if (grid1.length !== grid2.length) return false

  for (let i = 0; i < grid1.length; i++) {
    if (grid1[i].length !== grid2[i].length) return false

    for (let j = 0; j < grid1[i].length; j++) {
      if (grid1[i][j] !== grid2[i][j]) return false
    }
  }

  return true
}
