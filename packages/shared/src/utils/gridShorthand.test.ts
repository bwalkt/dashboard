import { describe, expect, it } from 'vitest'
import {
  analyzeGridCompaction,
  batchToCompact,
  batchToVerbose,
  extractGridReferences,
  isValidCompactExpression,
  isValidVerboseExpression,
  smartCompact,
  toCompactGrid,
  toVerboseGrid,
} from './gridShorthand.js'

describe('gridShorthand utilities', () => {
  describe('toCompactGrid', () => {
    it('should convert simple grid references', () => {
      expect(toCompactGrid('grid[4][0]')).toBe('g4.0')
      expect(toCompactGrid('grid[1][2]')).toBe('g1.2')
      expect(toCompactGrid('grid[10][99]')).toBe('g10.99')
    })

    it('should convert multiple grid references in expression', () => {
      const expr = 'add(grid[4][0], grid[1][2])'
      expect(toCompactGrid(expr)).toBe('add(g4.0, g1.2)')
    })

    it('should handle complex nested expressions', () => {
      const expr = 'multiply(sin(grid[0][1]), cos(grid[0][2]))'
      expect(toCompactGrid(expr)).toBe('multiply(sin(g0.1), cos(g0.2))')
    })

    it('should handle expressions with many grid references', () => {
      const expr = 'stats.mean([grid[2][3], grid[1][2], grid[3][2], grid[0][1]])'
      expect(toCompactGrid(expr)).toBe('stats.mean([g2.3, g1.2, g3.2, g0.1])')
    })

    it('should handle expressions without grid references', () => {
      const expr = 'sin(45) + cos(90)'
      expect(toCompactGrid(expr)).toBe(expr)
    })
  })

  describe('toVerboseGrid', () => {
    it('should convert simple compact references back', () => {
      expect(toVerboseGrid('g4.0')).toBe('grid[4][0]')
      expect(toVerboseGrid('g1.2')).toBe('grid[1][2]')
      expect(toVerboseGrid('g10.99')).toBe('grid[10][99]')
    })

    it('should convert multiple compact references in expression', () => {
      const expr = 'add(g4.0, g1.2)'
      expect(toVerboseGrid(expr)).toBe('add(grid[4][0], grid[1][2])')
    })

    it('should handle complex expressions', () => {
      const expr = 'multiply(sin(g0.1), cos(g0.2))'
      expect(toVerboseGrid(expr)).toBe('multiply(sin(grid[0][1]), cos(grid[0][2]))')
    })

    it('should be reversible', () => {
      const original = 'add(grid[4][0], multiply(grid[1][2], grid[3][3]))'
      const compact = toCompactGrid(original)
      const verbose = toVerboseGrid(compact)
      expect(verbose).toBe(original)
    })
  })

  describe('analyzeGridCompaction', () => {
    it('should calculate space savings correctly', () => {
      const expr = 'add(grid[4][0], grid[1][2])'
      const stats = analyzeGridCompaction(expr)

      expect(stats.originalLength).toBe(27)
      expect(stats.compactLength).toBe(15) // "add(g4.0, g1.2)"
      expect(stats.savedBytes).toBe(12)
      expect(stats.savedPercentage).toBeCloseTo(44.4, 1)
      expect(stats.referenceCount).toBe(2)
    })

    it('should handle expressions with many references', () => {
      const expr = 'mean([grid[0][0], grid[0][1], grid[0][2], grid[0][3]])'
      const stats = analyzeGridCompaction(expr)

      expect(stats.referenceCount).toBe(4)
      expect(stats.savedBytes).toBeGreaterThan(0)
    })

    it('should handle the long example from the image', () => {
      const longExpr =
        'timeseries.changePointDetection([hypot(linalg.qrDecomposition(grid), floor(grid[0][3])), timeseries.differencing([grid[2][3], cosh(grid[3][3]), grid[2][3]])], 5)'
      const stats = analyzeGridCompaction(longExpr)

      expect(stats.savedBytes).toBeGreaterThan(0)
      expect(stats.referenceCount).toBeGreaterThan(0)
    })
  })

  describe('validation functions', () => {
    it('should validate compact expressions', () => {
      expect(isValidCompactExpression('g4.0')).toBe(true)
      expect(isValidCompactExpression('add(g4.0, g1.2)')).toBe(true)
      expect(isValidCompactExpression('sin(45)')).toBe(true) // No grid refs
      expect(isValidCompactExpression('g4.0 + g1.2')).toBe(true)
    })

    it('should validate verbose expressions', () => {
      expect(isValidVerboseExpression('grid[4][0]')).toBe(true)
      expect(isValidVerboseExpression('add(grid[4][0], grid[1][2])')).toBe(true)
      expect(isValidVerboseExpression('sin(45)')).toBe(true) // No grid refs
    })
  })

  describe('extractGridReferences', () => {
    it('should extract references from verbose format', () => {
      const expr = 'add(grid[4][0], grid[1][2])'
      const refs = extractGridReferences(expr)

      expect(refs).toHaveLength(2)
      expect(refs[0]).toEqual({
        row: 4,
        col: 0,
        original: 'grid[4][0]',
        compact: 'g4.0',
      })
      expect(refs[1]).toEqual({
        row: 1,
        col: 2,
        original: 'grid[1][2]',
        compact: 'g1.2',
      })
    })

    it('should extract references from compact format', () => {
      const expr = 'add(g4.0, g1.2)'
      const refs = extractGridReferences(expr)

      expect(refs).toHaveLength(2)
      expect(refs[0]).toEqual({
        row: 4,
        col: 0,
        original: 'grid[4][0]',
        compact: 'g4.0',
      })
    })
  })

  describe('batch operations', () => {
    it('should batch convert to compact', () => {
      const expressions = ['grid[4][0]', 'add(grid[1][2], grid[3][3])', 'sin(grid[0][1])']

      const compact = batchToCompact(expressions)

      expect(compact).toEqual(['g4.0', 'add(g1.2, g3.3)', 'sin(g0.1)'])
    })

    it('should batch convert to verbose', () => {
      const expressions = ['g4.0', 'add(g1.2, g3.3)', 'sin(g0.1)']

      const verbose = batchToVerbose(expressions)

      expect(verbose).toEqual(['grid[4][0]', 'add(grid[1][2], grid[3][3])', 'sin(grid[0][1])'])
    })
  })

  describe('smartCompact', () => {
    it('should only compact long expressions', () => {
      const shortExpr = 'add(grid[4][0], grid[1][2])'
      const longExpr = 'a'.repeat(1001)

      expect(smartCompact(shortExpr, 1000)).toBe(shortExpr)
      expect(smartCompact(longExpr + 'grid[4][0]', 1000)).toContain('g4.0')
    })
  })

  describe('edge cases', () => {
    it('should handle empty expressions without NaN', () => {
      const empty = ''

      // Test analyzeGridCompaction with empty string
      const stats = analyzeGridCompaction(empty)
      expect(stats.originalLength).toBe(0)
      expect(stats.compactLength).toBe(0)
      expect(stats.savedBytes).toBe(0)
      expect(stats.savedPercentage).toBe(0) // Should be 0, not NaN
      expect(stats.referenceCount).toBe(0)
      expect(isNaN(stats.savedPercentage)).toBe(false)
    })

    it('should handle expressions with no grid references', () => {
      const expr = 'add(1, 2, 3)' // No grid references

      const stats = analyzeGridCompaction(expr)
      expect(stats.savedBytes).toBe(0)
      expect(stats.referenceCount).toBe(0)
      expect(stats.savedPercentage).toBe(0)
    })
  })

  describe('real-world space savings', () => {
    it('should significantly reduce the long expression from the image', () => {
      const longExpr = `timeseries.changePointDetection([hypot(linalg.qrDecomposition(grid), floor(grid[0][3])), timeseries.differencing([grid[2][3], cosh(grid[3][3]), grid[2][3], timeseries.holtWinters([grid[2][1], grid[4][0], grid[1][2], grid[4][1], grid[3][2], grid[2][0], grid[0][1], grid[0][3], grid[3][3], grid[4][2], grid[3][1], grid[1][3], grid[4][2], grid[3][3], grid[0][0]]), tanh(grid[1][0]), asec(grid[0][1]), linalg.qrDecomposition(grid), grid[3][0], cos(grid[4][1])], 2), stats.mean([grid[2][3], grid[1][2], grid[3][2], tsStats.median([grid[0][1], grid[1][0], grid[0][2]]), grid[1][0], grid[4][3]]), matrix.sumRow(grid, 2), grid[2][1], atan(signal.lowPassFilter([grid[4][2], grid[3][0], grid[0][0], grid[4][1], grid[2][0], grid[2][3], grid[3][0], grid[4][1], grid[1][0], grid[2][2], grid[2][0], grid[1][1], grid[4][1]], 0.45)), grid[2][4], grid[3][2]], 5)`

      const compact = toCompactGrid(longExpr)
      const stats = analyzeGridCompaction(longExpr)

      console.log('\n🎯 Real-world Example:')
      console.log(`Original length: ${longExpr.length}`)
      console.log(`Compact length: ${compact.length}`)
      console.log(`Saved: ${stats.savedBytes} bytes (${stats.savedPercentage.toFixed(1)}%)`)
      console.log(`Grid references: ${stats.referenceCount}`)

      expect(compact.length).toBeLessThan(longExpr.length)
      expect(stats.savedPercentage).toBeGreaterThan(30) // Should save at least 30%

      // Verify it's reversible
      const restored = toVerboseGrid(compact)
      expect(restored).toBe(longExpr)
    })
  })
})
