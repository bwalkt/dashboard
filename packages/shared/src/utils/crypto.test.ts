import { describe, expect, it } from 'vitest'
import { decrypt, decryptGrid, encrypt, encryptGrid } from './crypto'

describe('Crypto Encryption/Decryption', () => {
  const testSecret = 'test-secret-key-for-testing-only'

  describe('Round-trip encryption/decryption', () => {
    it('should encrypt and decrypt string data correctly', async () => {
      const originalData = 'Hello, World! This is a test string.'

      // Encrypt
      const encrypted = await encrypt(originalData, testSecret)
      expect(encrypted).toBeTruthy()
      expect(typeof encrypted).toBe('string')

      // Verify encrypted data is different from original
      expect(encrypted).not.toBe(originalData)

      // Decrypt
      const decrypted = await decrypt(encrypted, testSecret)

      // Verify decrypted data matches original
      expect(decrypted).toBe(originalData)
    })

    it('should encrypt and decrypt object data correctly', async () => {
      const originalData = {
        name: 'Test User',
        age: 30,
        email: 'test@example.com',
        nested: {
          field1: 'value1',
          field2: 123,
          array: [1, 2, 3],
        },
      }

      // Encrypt
      const encrypted = await encrypt(originalData, testSecret)
      expect(encrypted).toBeTruthy()
      expect(typeof encrypted).toBe('string')

      // Decrypt
      const decrypted = await decrypt(encrypted, testSecret)

      // Verify decrypted data matches original
      expect(decrypted).toEqual(originalData)
    })

    it('should encrypt and decrypt grid (number[][]) correctly', async () => {
      const originalGrid: number[][] = [
        [1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10],
        [11, 12, 13, 14, 15],
        [16, 17, 18, 19, 20],
        [21, 22, 23, 24, 25],
      ]

      // Encrypt using encryptGrid
      const encrypted = await encryptGrid(originalGrid, testSecret)
      expect(encrypted).toBeTruthy()
      expect(typeof encrypted).toBe('string')

      // Decrypt using decryptGrid
      const decryptedGrid = await decryptGrid(encrypted, testSecret)

      // Verify decrypted grid matches original
      expect(decryptedGrid).toEqual(originalGrid)
    })

    it('should handle large grid data correctly', async () => {
      // Create a larger grid (10x10)
      const originalGrid: number[][] = []
      for (let i = 0; i < 10; i++) {
        const row: number[] = []
        for (let j = 0; j < 10; j++) {
          row.push(i * 10 + j)
        }
        originalGrid.push(row)
      }

      // Encrypt
      const encrypted = await encryptGrid(originalGrid, testSecret)

      // Decrypt
      const decryptedGrid = await decryptGrid(encrypted, testSecret)

      // Verify
      expect(decryptedGrid).toEqual(originalGrid)
      expect(decryptedGrid.length).toBe(10)
      expect(decryptedGrid[0].length).toBe(10)
      expect(decryptedGrid[9][9]).toBe(99)
    })

    it('should handle empty arrays correctly', async () => {
      const originalData: number[][] = []

      const encrypted = await encryptGrid(originalData, testSecret)
      const decrypted = await decryptGrid(encrypted, testSecret)

      expect(decrypted).toEqual(originalData)
      expect(decrypted).toEqual([])
    })

    it('should handle special characters in string data', async () => {
      const originalData = '🎉 Unicode! 中文 عربي <>&"\'`@#$%^&*()'

      const encrypted = await encrypt(originalData, testSecret)
      const decrypted = await decrypt(encrypted, testSecret)

      expect(decrypted).toBe(originalData)
    })

    it('should produce different encrypted results for same data (due to random IV)', async () => {
      const originalData = 'Test data'

      const encrypted1 = await encrypt(originalData, testSecret)
      const encrypted2 = await encrypt(originalData, testSecret)

      // Encrypted data should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2)

      // But both should decrypt to the same original data
      const decrypted1 = await decrypt(encrypted1, testSecret)
      const decrypted2 = await decrypt(encrypted2, testSecret)

      expect(decrypted1).toBe(originalData)
      expect(decrypted2).toBe(originalData)
    })

    it('should fail to decrypt with wrong secret', async () => {
      const originalData = 'Secret data'
      const wrongSecret = 'wrong-secret-key'

      const encrypted = await encrypt(originalData, testSecret)

      // Decryption with wrong secret should fail
      await expect(decrypt(encrypted, wrongSecret)).rejects.toThrow()
    })

    it('should handle nested arrays and complex data structures', async () => {
      const originalData = {
        grid: [
          [1, 2, 3],
          [4, 5, 6],
        ],
        metadata: {
          created: '2024-01-01',
          modified: '2024-01-02',
          tags: ['test', 'encryption', 'grid'],
        },
        values: [null, undefined, 0, '', false, true],
      }

      const encrypted = await encrypt(originalData, testSecret)
      const decrypted = await decrypt(encrypted, testSecret)

      // Note: undefined values will be converted to null in JSON serialization
      const expectedData = {
        ...originalData,
        values: [null, null, 0, '', false, true], // undefined becomes null
      }

      expect(decrypted).toEqual(expectedData)
    })

    it('should maintain data integrity for floating point numbers', async () => {
      const originalGrid: number[][] = [
        [1.234567, 2.345678, 3.456789],
        [Math.PI, Math.E, Math.SQRT2],
        [-99.999, 0.00001, 1234567890.123],
      ]

      const encrypted = await encryptGrid(originalGrid, testSecret)
      const decrypted = await decryptGrid(encrypted, testSecret)

      expect(decrypted).toEqual(originalGrid)
      expect(decrypted[1][0]).toBe(Math.PI)
      expect(decrypted[1][1]).toBe(Math.E)
    })
  })

  describe('Error handling', () => {
    it('should throw error for invalid encrypted data', async () => {
      const invalidData = 'not-valid-encrypted-data'

      await expect(decrypt(invalidData, testSecret)).rejects.toThrow()
    })

    it('should throw error for corrupted encrypted data', async () => {
      const originalData = 'Test data'
      const encrypted = await encrypt(originalData, testSecret)

      // Parse and corrupt the encrypted data
      const parsed = JSON.parse(encrypted)
      parsed.encrypted = parsed.encrypted.substring(0, 10) + 'corrupted'
      const corrupted = JSON.stringify(parsed)

      await expect(decrypt(corrupted, testSecret)).rejects.toThrow()
    })

    it('should throw error for missing auth tag', async () => {
      const originalData = 'Test data'
      const encrypted = await encrypt(originalData, testSecret)

      // Remove auth tag
      const parsed = JSON.parse(encrypted)
      delete parsed.authTag
      const corrupted = JSON.stringify(parsed)

      await expect(decrypt(corrupted, testSecret)).rejects.toThrow()
    })
  })
})
