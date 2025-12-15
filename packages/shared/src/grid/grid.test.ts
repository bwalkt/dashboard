import { describe, expect, it, vi } from 'vitest'
import { evaluate, expandGrid, genFunction, genGrid, getMatrixCols, getMatrixRows } from './grid.js'

describe('genGrid', () => {
  it('should generate a grid with default size of 5x5', () => {
    const grid = genGrid()
    expect(grid).toHaveLength(5)
    expect(grid[0]).toHaveLength(5)
  })

  it('should generate a grid with specified size', () => {
    const size = 10
    const grid = genGrid(size)
    expect(grid).toHaveLength(size)
    expect(grid[0]).toHaveLength(size)
  })

  it('should generate a grid with numbers within expected range', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const grid = genGrid(3)
    // @ts-ignore
    grid.forEach((row: number[]) => {
      row.forEach(cell => {
        expect(typeof cell).toBe('number')
        expect(cell).toBeGreaterThan(0)
      })
    })
    spy.mockRestore()
  })
})

describe('expandGrid', () => {
  it('should return original grid when newSize is smaller than current size', () => {
    const originalGrid = [
      [1, 2],
      [3, 4],
    ]
    const result = expandGrid(originalGrid, 1)
    expect(result).toBe(originalGrid)
    expect(result).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  it('should return original grid when newSize equals current size', () => {
    const originalGrid = [
      [1, 2],
      [3, 4],
    ]
    const result = expandGrid(originalGrid, 2)
    expect(result).toBe(originalGrid)
    expect(result).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  it('should expand grid when newSize is larger than current size', () => {
    const originalGrid = [
      [1, 2],
      [3, 4],
    ]
    const result = expandGrid(originalGrid, 4)
    expect(result).toHaveLength(4)
    expect(result[0]).toHaveLength(4) // Now a proper 4x4 grid, not jagged
    expect(result[1]).toHaveLength(4)
    expect(result[2]).toHaveLength(4)
    expect(result[3]).toHaveLength(4)
    // Original values preserved in top-left
    expect(result[0][0]).toBe(1)
    expect(result[0][1]).toBe(2)
    expect(result[1][0]).toBe(3)
    expect(result[1][1]).toBe(4)
    // New values are numbers
    expect(typeof result[0][2]).toBe('number')
    expect(typeof result[2][0]).toBe('number')
  })

  it('should handle empty grid expansion', () => {
    const originalGrid: number[][] = []
    const result = expandGrid(originalGrid, 2)
    expect(result).toHaveLength(2)
  })
})

describe('genFunction', () => {
  it('should generate a function with valid structure', () => {
    const result = genFunction(1, 5)

    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('expression')
    expect(result).toHaveProperty('simplifiedExpression')
    expect(result).toHaveProperty('xCell')
    expect(result).toHaveProperty('yCell')
    expect(result).toHaveProperty('complexity')
    expect(typeof result.expression).toBe('string')
    expect(typeof result.simplifiedExpression).toBe('string')
  })

  it('should generate cell references within grid bounds', () => {
    const size = 5
    const result = genFunction(1, size)

    expect(result.xCell.row).toBeGreaterThanOrEqual(0)
    expect(result.xCell.row).toBeLessThan(size)
    expect(result.xCell.col).toBeGreaterThanOrEqual(0)
    expect(result.xCell.col).toBeLessThan(size)
    expect(result.yCell.row).toBeGreaterThanOrEqual(0)
    expect(result.yCell.row).toBeLessThan(size)
    expect(result.yCell.col).toBeGreaterThanOrEqual(0)
    expect(result.yCell.col).toBeLessThan(size)
  })

  it('should simplify expressions using math.js', () => {
    const result = genFunction(1, 5)

    // The expression should be present
    expect(result.expression).toBeTruthy()
    // The simplified expression should also be present
    expect(result.simplifiedExpression).toBeTruthy()
  })

  it('should generate different complexity levels', () => {
    const level1 = genFunction(1, 5)
    const level2 = genFunction(2, 5)
    const level3 = genFunction(3, 5)

    expect(level1.complexity.level).toBe(1)
    expect(level2.complexity.level).toBe(2)
    expect(level3.complexity.level).toBe(3)
  })

  it('should validate size parameter and throw for invalid sizes', () => {
    // Valid sizes should not throw
    expect(() => genFunction(1, 1)).not.toThrow()
    expect(() => genFunction(1, 5)).not.toThrow()
    expect(() => genFunction(1, 10)).not.toThrow()

    // Invalid sizes should throw
    expect(() => genFunction(1, 0)).toThrow('Grid size must be a positive integer')
    expect(() => genFunction(1, -1)).toThrow('Grid size must be a positive integer')
    expect(() => genFunction(1, 0.5)).toThrow('Grid size must be a positive integer')
  })

  it('should include simplification metadata', () => {
    const result = genFunction(1, 5)

    expect(result.metadata).toHaveProperty('simplification')
    expect(result.metadata.simplification).toHaveProperty('succeeded')
    expect(typeof result.metadata.simplification.succeeded).toBe('boolean')

    // Error field may or may not be present depending on simplification success
    if (!result.metadata.simplification.succeeded) {
      expect(result.metadata.simplification).toHaveProperty('error')
      expect(typeof result.metadata.simplification.error).toBe('string')
    }
  })

  it('should include gridSize in metadata', () => {
    const result = genFunction(2, 7)

    expect(result.metadata).toHaveProperty('gridSize')
    expect(result.metadata.gridSize).toBe(7)
  })

  it('should have compactExpression match simplifiedExpression', () => {
    const result = genFunction(1, 5)

    expect(result.compactExpression).toBe(result.simplifiedExpression)
  })

  it('should have non-negative space savings', () => {
    const result = genFunction(2, 5)

    expect(result.metadata.spaceSavings.savedBytes).toBeGreaterThanOrEqual(0)
    expect(result.metadata.spaceSavings.savedPercentage).toBeGreaterThanOrEqual(0)
  })
})

describe('evaluate', () => {
  it('should evaluate simple arithmetic expressions with x and y', () => {
    const grid = [
      [2, 3, 4],
      [5, 6, 7],
    ]

    // Test addition: x + y where x = grid[0][0], y = grid[0][1]
    const addFunc = { expression: 'x + y', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 1 } }
    expect(evaluate(grid, addFunc)).toBe(5) // 2 + 3

    // Test multiplication
    const multiplyFunc = { expression: 'x * y', xCell: { row: 0, col: 0 }, yCell: { row: 1, col: 1 } }
    expect(evaluate(grid, multiplyFunc)).toBe(12) // 2 * 6
  })

  it('should evaluate expressions with powers', () => {
    const grid = [
      [2, 3],
      [4, 5],
    ]

    // Test x^2
    const sqFunc = { expression: 'x^2', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 1 } }
    expect(evaluate(grid, sqFunc)).toBe(4) // 2^2

    // Test x^2 + y
    const complexFunc = { expression: 'x^2 + y', xCell: { row: 1, col: 0 }, yCell: { row: 1, col: 1 } }
    expect(evaluate(grid, complexFunc)).toBe(21) // 4^2 + 5 = 16 + 5
  })

  it('should evaluate trigonometric functions', () => {
    const grid = [
      [0, Math.PI / 2],
      [Math.PI, 1],
    ]

    // Test sine
    const sinFunc = { expression: 'sin(x)', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 1 } }
    expect(evaluate(grid, sinFunc)).toBeCloseTo(0, 3) // sin(0)

    // Test cosine
    const cosFunc = { expression: 'cos(x)', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 1 } }
    expect(evaluate(grid, cosFunc)).toBe(1) // cos(0)
  })

  it('should work with randomly generated functions', () => {
    const grid = genGrid(5)
    const randomFunc = genFunction(2, 5)

    // Should not throw an error
    expect(() =>
      evaluate(grid, {
        expression: randomFunc.expression,
        xCell: randomFunc.xCell,
        yCell: randomFunc.yCell,
      }),
    ).not.toThrow()

    // Should return a number or string
    const result = evaluate(grid, {
      expression: randomFunc.expression,
      xCell: randomFunc.xCell,
      yCell: randomFunc.yCell,
    })
    expect(['number', 'string'].includes(typeof result)).toBe(true)
    if (typeof result === 'number') {
      expect(isNaN(result)).toBe(false)
    }
  })

  it('should handle division', () => {
    const grid = [
      [10, 2],
      [4, 5],
    ]

    const divideFunc = { expression: 'x / y', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 1 } }
    const result = evaluate(grid, divideFunc)
    expect(result).toBe(5) // 10 / 2
  })

  it('should round results to 3 decimal places', () => {
    const grid = [
      [1, 3],
      [7, 11],
    ]

    // Test division that results in repeating decimal
    const divideFunc = { expression: 'x / y', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 1 } }
    const result = evaluate(grid, divideFunc)
    expect(result).toBe(0.333) // 1/3 = 0.333... rounded to 3 decimal places
  })

  it('should handle infinity results', () => {
    const grid = [
      [4920, 7686],
      [1, 1000],
    ]

    // Test expression that results in positive infinity: exp(y/5) with large y
    const infFunc = { expression: '5*log(x) + exp(y/5)', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 1 } }
    const result = evaluate(grid, infFunc)
    expect(result).toBe('∞') // exp(7686/5) = exp(1537.2) = Infinity

    // Test expression that results in negative infinity
    const negInfFunc = { expression: '-exp(y)', xCell: { row: 0, col: 0 }, yCell: { row: 1, col: 1 } }
    const negResult = evaluate(grid, negInfFunc)
    expect(negResult).toBe('-∞') // -exp(1000) = -Infinity

    // Test division by zero resulting in infinity
    const divByZeroFunc = { expression: '1 / (x - x)', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 1 } }
    const infResult2 = evaluate(grid, divByZeroFunc)
    expect(infResult2).toBe('∞') // 1/0 = Infinity in JavaScript
    
    // Test 0/0 resulting in NaN
    const nanFunc = { expression: '(x - x) / (y - y)', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 1 } }
    const nanResult = evaluate(grid, nanFunc)
    expect(nanResult).toBe('NaN') // 0/0 = NaN in JavaScript
  })

  it('should handle temperature conversions from degC to degF', () => {
    const grid = [
      [0, 100],
      [20, 37],
    ]

    // Test 0°C to °F (freezing point)
    const freezingFunc = { expression: '(x + 0) degC to degF', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 1 } }
    const freezingResult = evaluate(grid, freezingFunc)
    expect(freezingResult).toBe('32 degF') // 0°C = 32°F

    // Test 100°C to °F (boiling point)
    const boilingFunc = { expression: '(y + 0) degC to degF', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 1 } }
    const boilingResult = evaluate(grid, boilingFunc)
    expect(boilingResult).toBe('212 degF') // 100°C = 212°F

    // Test 20°C to °F (room temperature)
    const roomTempFunc = { expression: '(x + 0) degC to degF', xCell: { row: 1, col: 0 }, yCell: { row: 1, col: 1 } }
    const roomTempResult = evaluate(grid, roomTempFunc)
    expect(roomTempResult).toBe('68 degF') // 20°C = 68°F
  })

  it('should handle temperature conversion expressions with operations', () => {
    const grid = [
      [10, 5],
      [20, 10],
    ]

    // Test addition with temperature conversion: (x + y) degC to degF
    const addTempFunc = { expression: '(x + y) degC to degF', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 1 } }
    const addTempResult = evaluate(grid, addTempFunc)
    // (10 + 5) = 15°C = 59°F
    expect(addTempResult).toBe('59 degF')

    // Test division with temperature conversion: (x / y) degC to degF
    const divTempFunc = { expression: '(x / y) degC to degF', xCell: { row: 1, col: 0 }, yCell: { row: 1, col: 1 } }
    const divTempResult = evaluate(grid, divTempFunc)
    // (20 / 10) = 2°C = 35.6°F
    expect(divTempResult).toBe('35.6 degF')
  })

  it('should handle other unit conversions correctly', () => {
    const grid = [
      [10, 5],
      [100, 2],
    ]

    // Test inch to cm conversion
    const inchToCmFunc = { expression: '(x + y) inch to cm', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 1 } }
    const inchToCmResult = evaluate(grid, inchToCmFunc)
    // (10 + 5) = 15 inches = 38.1 cm
    expect(inchToCmResult).toBe('38.1 cm')

    // Test meter to feet conversion
    const mToFtFunc = { expression: '(x / y) m to ft', xCell: { row: 1, col: 0 }, yCell: { row: 1, col: 1 } }
    const mToFtResult = evaluate(grid, mToFtFunc)
    // (100 / 2) = 50 m ≈ 164.042 ft
    expect(mToFtResult).toBe('164.042 ft')
  })

  it('should correctly extract numeric values in target unit, not SI base unit', () => {
    const grid = [
      [2, 0],
      [1, 0],
    ]

    // Test that 2 inches is converted correctly to 5.08 cm, not 0.0508 (which would be meters)
    const inchFunc = { expression: '(x + 0) inch to cm', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 1 } }
    const inchResult = evaluate(grid, inchFunc)
    expect(inchResult).toBe('5.08 cm')

    // Test that 1 meter is converted correctly to 3.281 ft, not some SI base value
    const meterFunc = { expression: '(x + 0) m to ft', xCell: { row: 1, col: 0 }, yCell: { row: 1, col: 1 } }
    const meterResult = evaluate(grid, meterFunc)
    expect(meterResult).toBe('3.281 ft')
  })

  it('should fallback to 0 for out-of-bounds cell references', () => {
    const grid = [
      [5, 10],
      [15, 20],
    ]

    // Test x cell out of bounds (row)
    const outOfBoundsX = { expression: 'x + y', xCell: { row: 10, col: 0 }, yCell: { row: 0, col: 1 } }
    expect(evaluate(grid, outOfBoundsX)).toBe(10) // 0 + 10

    // Test y cell out of bounds (col)
    const outOfBoundsY = { expression: 'x + y', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 10 } }
    expect(evaluate(grid, outOfBoundsY)).toBe(5) // 5 + 0

    // Test both cells out of bounds
    const bothOutOfBounds = { expression: 'x * y', xCell: { row: 10, col: 10 }, yCell: { row: -1, col: -1 } }
    expect(evaluate(grid, bothOutOfBounds)).toBe(0) // 0 * 0

    // Test negative indices (should also fallback to 0)
    const negativeIndices = { expression: 'x - y', xCell: { row: -1, col: 0 }, yCell: { row: 0, col: -1 } }
    expect(evaluate(grid, negativeIndices)).toBe(0) // 0 - 0
  })

  it('should handle edge cases with infinity and very large numbers', () => {
    const grid = [
      [1, 0],
      [Number.MAX_SAFE_INTEGER + 1, 2],
    ]

    // Test division by zero (results in Infinity)
    const divByZero = { expression: 'x / y', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 1 } }
    expect(evaluate(grid, divByZero)).toBe('∞') // 1/0 = Infinity -> '∞'

    // Test very large number multiplication (now returns in exponential notation)
    const largeNum = { expression: 'x * x', xCell: { row: 1, col: 0 }, yCell: { row: 1, col: 1 } }
    const result = evaluate(grid, largeNum)
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThan(1e15) // Should be very large
    expect(result.toString()).toContain('e+') // Should be in exponential notation
  })

  it('should throw error with strictBounds when cell references are out of bounds', () => {
    const grid = [
      [5, 10],
      [15, 20],
    ]

    // Test x cell out of bounds with strict mode
    const outOfBoundsX = { expression: 'x + y', xCell: { row: 10, col: 0 }, yCell: { row: 0, col: 1 } }
    expect(() => evaluate(grid, outOfBoundsX, { strictBounds: true })).toThrow('xCell out of bounds')

    // Test y cell out of bounds with strict mode
    const outOfBoundsY = { expression: 'x + y', xCell: { row: 0, col: 0 }, yCell: { row: 0, col: 10 } }
    expect(() => evaluate(grid, outOfBoundsY, { strictBounds: true })).toThrow('yCell out of bounds')

    // Test negative indices with strict mode
    const negativeX = { expression: 'x + y', xCell: { row: -1, col: 0 }, yCell: { row: 0, col: 0 } }
    expect(() => evaluate(grid, negativeX, { strictBounds: true })).toThrow('xCell out of bounds')

    // Without strict mode, should fallback to 0 (already tested in previous test)
    expect(evaluate(grid, outOfBoundsX)).toBe(10) // No error, fallback to 0
  })

  it('should work normally with strictBounds when cells are within bounds', () => {
    const grid = [
      [5, 10],
      [15, 20],
    ]

    const validFunc = { expression: 'x + y', xCell: { row: 0, col: 0 }, yCell: { row: 1, col: 1 } }

    // Should work the same with or without strict bounds when cells are valid
    expect(evaluate(grid, validFunc, { strictBounds: true })).toBe(25) // 5 + 20
    expect(evaluate(grid, validFunc, { strictBounds: false })).toBe(25) // 5 + 20
    expect(evaluate(grid, validFunc)).toBe(25) // 5 + 20 (default)
  })

  it('should handle very large numbers correctly', () => {
    const grid = [
      [7947, 59713],
      [1000, 2000],
    ]

    // Test very large power calculation
    const largePowerFunc = { 
      expression: 'x^7', 
      xCell: { row: 0, col: 0 }, 
      yCell: { row: 0, col: 1 } 
    }
    const result = evaluate(grid, largePowerFunc)
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThan(1e15) // Should be in exponential notation range
    expect(result.toString()).toContain('e+') // Should be in exponential format
    
    // Test very large calculation with unit conversion
    const largeUnitFunc = { 
      expression: 'abs(x^7 - y^2) m to ft', 
      xCell: { row: 0, col: 0 }, 
      yCell: { row: 0, col: 1 } 
    }
    const unitResult = evaluate(grid, largeUnitFunc)
    expect(typeof unitResult).toBe('string')
    expect(unitResult).toContain('e+') // Should contain exponential notation
    expect(unitResult).toContain('ft') // Should contain unit
    expect(unitResult).not.toBe('0 ft') // Should NOT be zero
    
    // Test that normal-sized numbers still work correctly
    const normalFunc = { 
      expression: 'x + y', 
      xCell: { row: 1, col: 0 }, 
      yCell: { row: 1, col: 1 } 
    }
    const normalResult = evaluate(grid, normalFunc)
    expect(normalResult).toBe(3000) // 1000 + 2000
    expect(normalResult.toString()).not.toContain('e+') // Should NOT be in exponential format
  })
})

describe('matrix spec parsing edge cases', () => {
  const testGrid = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ]

  it('should handle specs with whitespace', () => {
    // Spec with leading whitespace
    const rows1 = getMatrixRows(testGrid, ' 1-2')
    expect(rows1).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
    ])

    // Spec with trailing whitespace
    const rows2 = getMatrixRows(testGrid, '1-2 ')
    expect(rows2).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
    ])

    // Spec with both leading and trailing whitespace
    const rows3 = getMatrixRows(testGrid, ' odd ')
    expect(rows3).toEqual([
      [1, 2, 3, 4],
      [9, 10, 11, 12],
    ])

    // Spec with whitespace around "even"
    const cols1 = getMatrixCols(testGrid, ' even ')
    expect(cols1).toEqual([
      [2, 6, 10, 14],
      [4, 8, 12, 16],
    ])

    // Spec with whitespace around "all"
    const rows4 = getMatrixRows(testGrid, ' all ')
    expect(rows4).toEqual(testGrid)
  })

  it('should return empty array for invalid ranges (end < start)', () => {
    // Range where end < start (4-1 means start=3, end=0)
    const invalidRange = getMatrixRows(testGrid, '4-1')
    expect(invalidRange).toEqual([])

    // Another invalid range
    const invalidRange2 = getMatrixCols(testGrid, '3-1')
    expect(invalidRange2).toEqual([])
  })

  it('should return empty array for out-of-bounds ranges', () => {
    // Range starting beyond the matrix size
    const outOfBounds = getMatrixRows(testGrid, '10-12')
    expect(outOfBounds).toEqual([])

    // Range with start >= maxIndex
    const outOfBounds2 = getMatrixCols(testGrid, '5-7')
    expect(outOfBounds2).toEqual([])
  })

  it('should handle edge case ranges correctly', () => {
    // Range from 1-1 (just first row)
    const singleRow = getMatrixRows(testGrid, '1-1')
    expect(singleRow).toEqual([[1, 2, 3, 4]])

    // Range to last element
    const toEnd = getMatrixRows(testGrid, '3-4')
    expect(toEnd).toEqual([
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ])

    // Range that would partially exceed bounds (clamped)
    const partialOverflow = getMatrixCols(testGrid, '3-10')
    expect(partialOverflow).toEqual([
      [3, 7, 11, 15],
      [4, 8, 12, 16],
    ])
  })

  it('should handle comma-separated lists with whitespace', () => {
    // List with spaces around commas
    const rows = getMatrixRows(testGrid, '1 , 3 , 4')
    expect(rows).toEqual([
      [1, 2, 3, 4],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ])

    // List with inconsistent spacing
    const cols = getMatrixCols(testGrid, '1,  2,    3')
    expect(cols).toEqual([
      [1, 5, 9, 13],
      [2, 6, 10, 14],
      [3, 7, 11, 15],
    ])
  })

  it('should filter out invalid indices in lists', () => {
    // List with out-of-bounds indices (0 and 5 are invalid)
    const rows = getMatrixRows(testGrid, '0,1,2,5')
    expect(rows).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
    ]) // Only 1 and 2 are valid

    // List with negative indices
    const cols = getMatrixCols(testGrid, '-1,1,2')
    expect(cols).toEqual([
      [1, 5, 9, 13],
      [2, 6, 10, 14],
    ]) // -1 is filtered out
  })

  it('should handle single index with whitespace', () => {
    const rows = getMatrixRows(testGrid, ' 2 ')
    expect(rows).toEqual([[5, 6, 7, 8]])

    const cols = getMatrixCols(testGrid, ' 3 ')
    expect(cols).toEqual([[3, 7, 11, 15]])
  })

  it('should return empty array for completely invalid specs', () => {
    // Empty spec after trim
    const empty1 = getMatrixRows(testGrid, '   ')
    expect(empty1).toEqual([])

    // Invalid spec format
    const invalid = getMatrixCols(testGrid, 'invalid')
    expect(invalid).toEqual([])

    // Spec that looks like a number but is invalid
    const invalidNum = getMatrixRows(testGrid, '0')
    expect(invalidNum).toEqual([]) // 0 is invalid (1-indexed)

    // Negative single index
    const negative = getMatrixCols(testGrid, '-1')
    expect(negative).toEqual([])
  })

  it('should handle ragged matrices by defaulting to 0 for undefined values', () => {
    // Create a ragged matrix where rows have different lengths
    const raggedMatrix = [
      [1, 2, 3, 4], // Full length row
      [5, 6], // Short row (missing columns 2 and 3)
      [7, 8, 9], // Medium row (missing column 3)
      [10], // Very short row (missing columns 1, 2, and 3)
    ]

    // Test getting all columns - should fill in 0s for missing values
    const col1 = getMatrixCols(raggedMatrix, '1')
    expect(col1).toEqual([[1, 5, 7, 10]]) // Column 0 - all present

    const col2 = getMatrixCols(raggedMatrix, '2')
    expect(col2).toEqual([[2, 6, 8, 0]]) // Column 1 - row 3 missing (defaults to 0)

    const col3 = getMatrixCols(raggedMatrix, '3')
    expect(col3).toEqual([[3, 0, 9, 0]]) // Column 2 - rows 1 and 3 missing

    const col4 = getMatrixCols(raggedMatrix, '4')
    expect(col4).toEqual([[4, 0, 0, 0]]) // Column 3 - only row 0 has it

    // Test getting multiple columns at once
    const cols12 = getMatrixCols(raggedMatrix, '1,2')
    expect(cols12).toEqual([
      [1, 5, 7, 10], // Column 0
      [2, 6, 8, 0], // Column 1
    ])

    // Test range of columns on ragged matrix
    const cols234 = getMatrixCols(raggedMatrix, '2-4')
    expect(cols234).toEqual([
      [2, 6, 8, 0], // Column 1
      [3, 0, 9, 0], // Column 2
      [4, 0, 0, 0], // Column 3
    ])

    // Test "all" spec on ragged matrix
    const allCols = getMatrixCols(raggedMatrix, 'all')
    expect(allCols).toEqual([
      [1, 5, 7, 10], // Column 0
      [2, 6, 8, 0], // Column 1
      [3, 0, 9, 0], // Column 2
      [4, 0, 0, 0], // Column 3
    ])

    // Test "even" columns on ragged matrix
    const evenCols = getMatrixCols(raggedMatrix, 'even')
    expect(evenCols).toEqual([
      [2, 6, 8, 0], // Column 1 (2nd column, even in 1-indexed)
      [4, 0, 0, 0], // Column 3 (4th column, even in 1-indexed)
    ])

    // Test "odd" columns on ragged matrix
    const oddCols = getMatrixCols(raggedMatrix, 'odd')
    expect(oddCols).toEqual([
      [1, 5, 7, 10], // Column 0 (1st column, odd in 1-indexed)
      [3, 0, 9, 0], // Column 2 (3rd column, odd in 1-indexed)
    ])
  })
})
