import { describe, expect, it, vi } from 'vitest'
import { evaluate, expandGrid, genFunction, genGrid } from './grid.js'

describe('genGrid', () => {
  it('should generate a grid with default size of 10x10', () => {
    const grid = genGrid(10)
    expect(grid).toHaveLength(10)
    expect(grid[0]).toHaveLength(10)
  })

  it('should generate a grid with specified size', () => {
    const size = 5
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
    expect(result[0]).toEqual([1, 2])
    expect(result[1]).toEqual([3, 4])
    expect(result[2]).toBeDefined()
    expect(result[3]).toBeDefined()
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
})
