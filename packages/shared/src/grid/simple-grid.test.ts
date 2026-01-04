import { describe, expect, it } from 'vitest'
import { decryptGrid, encryptGrid, genGrid, gridsEqual } from './simpleGrid.js'

describe('Simple Grid Functions', () => {
  describe('genGrid', () => {
    it('should generate grid with default parameters', () => {
      const grid = genGrid()
      expect(grid).toHaveLength(5)
      expect(grid[0]).toHaveLength(5)

      // Check all values are between 0 and 9
      for (const row of grid) {
        for (const val of row) {
          expect(val).toBeGreaterThanOrEqual(0)
          expect(val).toBeLessThanOrEqual(9)
          expect(Number.isInteger(val)).toBe(true)
        }
      }
    })

    it('should generate grid with custom parameters', () => {
      const grid = genGrid(3, 4, 10, 20)
      expect(grid).toHaveLength(3)
      expect(grid[0]).toHaveLength(4)

      // Check all values are between 10 and 20
      for (const row of grid) {
        for (const val of row) {
          expect(val).toBeGreaterThanOrEqual(10)
          expect(val).toBeLessThanOrEqual(20)
          expect(Number.isInteger(val)).toBe(true)
        }
      }
    })
  })

  describe('encryptGrid and decryptGrid', () => {
    it('should encrypt and decrypt grid correctly', async () => {
      const originalGrid = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ]
      const secret = 'test-secret-key'

      // Encrypt the grid
      const encrypted = await encryptGrid(originalGrid, secret)
      expect(encrypted).toHaveProperty('encrypted')
      expect(encrypted).toHaveProperty('iv')
      expect(encrypted).toHaveProperty('authTag')
      expect(encrypted.encrypted).toBeTruthy()
      expect(encrypted.iv).toBeTruthy()
      expect(encrypted.authTag).toBeTruthy()

      // Decrypt the grid
      const decrypted = await decryptGrid(encrypted, secret)
      expect(decrypted).toEqual(originalGrid)
    })

    it('should fail to decrypt with wrong secret', async () => {
      const grid = [
        [1, 2],
        [3, 4],
      ]
      const correctSecret = 'correct-secret'
      const wrongSecret = 'wrong-secret'

      const encrypted = await encryptGrid(grid, correctSecret)

      // Should throw error with wrong secret
      await expect(decryptGrid(encrypted, wrongSecret)).rejects.toThrow()
    })

    it('should handle large grids', async () => {
      const largeGrid = genGrid(100, 100, 0, 999)
      const secret = 'large-grid-secret'

      const encrypted = await encryptGrid(largeGrid, secret)
      const decrypted = await decryptGrid(encrypted, secret)

      expect(gridsEqual(largeGrid, decrypted)).toBe(true)
    })
  })

  describe('gridsEqual', () => {
    it('should detect equal grids', () => {
      const grid1 = [
        [1, 2],
        [3, 4],
      ]
      const grid2 = [
        [1, 2],
        [3, 4],
      ]

      expect(gridsEqual(grid1, grid2)).toBe(true)
    })

    it('should detect different values', () => {
      const grid1 = [
        [1, 2],
        [3, 4],
      ]
      const grid2 = [
        [1, 2],
        [3, 5],
      ]

      expect(gridsEqual(grid1, grid2)).toBe(false)
    })

    it('should detect different dimensions', () => {
      const grid1 = [
        [1, 2],
        [3, 4],
      ]
      const grid2 = [
        [1, 2, 3],
        [4, 5, 6],
      ]

      expect(gridsEqual(grid1, grid2)).toBe(false)
    })

    it('should handle empty grids', () => {
      expect(gridsEqual([], [])).toBe(true)
      expect(gridsEqual([[]], [[]])).toBe(true)
      expect(gridsEqual([], [[]])).toBe(false)
    })
  })
})
