import { describe, expect, it, vi } from 'vitest'
import { evaluate, expandGrid, genGrid, genRandomMathFunction } from './grid'

describe('genGrid', () => {
    it('should generate a grid with default size of 10x10', () => {
        const grid = genGrid()
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
        const originalGrid = [[1, 2], [3, 4]]
        const result = expandGrid(originalGrid, 1)
        expect(result).toBe(originalGrid)
        expect(result).toEqual([[1, 2], [3, 4]])
    })

    it('should return original grid when newSize equals current size', () => {
        const originalGrid = [[1, 2], [3, 4]]
        const result = expandGrid(originalGrid, 2)
        expect(result).toBe(originalGrid)
        expect(result).toEqual([[1, 2], [3, 4]])
    })

    it('should expand grid when newSize is larger than current size', () => {
        const originalGrid = [[1, 2], [3, 4]]
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

describe('genRandomMathFunction', () => {
    it('should generate a random math function with valid structure', () => {
        const result = genRandomMathFunction(10)

        expect(result).toHaveProperty('functionName')
        expect(result).toHaveProperty('expression')
        expect(result).toHaveProperty('cells')
        expect(result).toHaveProperty('readable')
        expect(typeof result.functionName).toBe('string')
        expect(typeof result.expression).toBe('string')
        expect(Array.isArray(result.cells)).toBe(true)
        expect(typeof result.readable).toBe('string')
    })

    it('should generate cell references within grid bounds', () => {
        const size = 5
        const result = genRandomMathFunction(size)

        result.cells.forEach(cell => {
            expect(cell.row).toBeGreaterThanOrEqual(0)
            expect(cell.row).toBeLessThan(size)
            expect(cell.col).toBeGreaterThanOrEqual(0)
            expect(cell.col).toBeLessThan(size)
        })
    })

    it('should generate expression with grid array syntax', () => {
        const result = genRandomMathFunction(10)

        expect(result.expression).toContain(result.functionName)
        expect(result.expression).toContain('grid[')
        expect(result.expression).toContain('][')
    })

    it('should generate readable format with row/column notation', () => {
        const result = genRandomMathFunction(10)

        expect(result.readable).toContain(result.functionName)
        expect(result.readable).toContain('row')
        expect(result.readable).toContain('column')
    })

    it('should generate different functions on multiple calls', () => {
        const results = new Set()

        // Generate 20 random functions
        for (let i = 0; i < 20; i++) {
            const result = genRandomMathFunction(10)
            results.add(result.functionName)
        }

        // Should have at least some variety (not all the same function)
        // With 20+ functions available, getting at least 2 different ones is very likely
        expect(results.size).toBeGreaterThan(1)
    })

    it('should match cell count to function parameter requirements', () => {
        const result = genRandomMathFunction(10)

        // Count parameters in expression
        const paramCount = result.cells.length

        expect(paramCount).toBeGreaterThan(0)
        expect(paramCount).toBeLessThanOrEqual(2) // Max params in our function list
    })
})

describe('evaluate', () => {
    it('should evaluate simple arithmetic expressions', () => {
        const grid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
        
        // Test addition
        const addFunc = { expression: 'add(grid[0][0], grid[0][1])' }
        expect(evaluate(grid, addFunc)).toBe(3) // 1 + 2
        
        // Test multiplication
        const multiplyFunc = { expression: 'multiply(grid[1][1], grid[2][2])' }
        expect(evaluate(grid, multiplyFunc)).toBe(45) // 5 * 9
    })

    it('should evaluate single parameter functions', () => {
        const grid = [[16, 25, 36], [49, 64, 81]]
        
        // Test square root
        const sqrtFunc = { expression: 'sqrt(grid[0][0])' }
        expect(evaluate(grid, sqrtFunc)).toBe(4) // sqrt(16)
        
        // Test absolute value
        const absFunc = { expression: 'abs(grid[1][2])' }
        expect(evaluate(grid, absFunc)).toBe(81) // abs(81)
    })

    it('should evaluate trigonometric functions', () => {
        const grid = [[0, Math.PI / 2, Math.PI], [3 * Math.PI / 2, 2 * Math.PI, 1]]
        
        // Test sine
        const sinFunc = { expression: 'sin(grid[0][0])' }
        expect(evaluate(grid, sinFunc)).toBeCloseTo(0, 3) // sin(0), rounded to 3 decimal places
        
        // Test cosine
        const cosFunc = { expression: 'cos(grid[0][0])' }
        expect(evaluate(grid, cosFunc)).toBe(1) // cos(0)
    })

    it('should evaluate complex expressions with multiple operations', () => {
        const grid = [[2, 3, 4], [5, 6, 7], [8, 9, 10]]
        
        // Test pow function
        const powFunc = { expression: 'pow(grid[0][0], grid[0][1])' }
        expect(evaluate(grid, powFunc)).toBe(8) // 2^3
        
        // Test max function
        const maxFunc = { expression: 'max(grid[1][0], grid[2][1])' }
        expect(evaluate(grid, maxFunc)).toBe(9) // max(5, 9)
    })

    it('should handle edge cases with zero and negative numbers', () => {
        const grid = [[-5, 0, 10], [-2, 3, -8]]
        
        // Test with negative numbers
        const addFunc = { expression: 'add(grid[0][0], grid[1][0])' }
        expect(evaluate(grid, addFunc)).toBe(-7) // -5 + (-2)
        
        // Test with zero
        const multiplyFunc = { expression: 'multiply(grid[0][1], grid[1][1])' }
        expect(evaluate(grid, multiplyFunc)).toBe(0) // 0 * 3
    })

    it('should work with randomly generated functions', () => {
        const grid = genGrid(5) as unknown as number[][]  // mathjs returns 2D array but types are incorrect
        const randomFunc = genRandomMathFunction(5)
        
        // Should not throw an error
        expect(() => evaluate(grid, randomFunc)).not.toThrow()
        
        // Should return a number
        const result = evaluate(grid, randomFunc)
        expect(typeof result).toBe('number')
        expect(isNaN(result)).toBe(false)
    })

    it('should handle division by zero gracefully', () => {
        const grid = [[1, 0, 3], [4, 5, 6]]
        
        const divideFunc = { expression: 'divide(grid[0][0], grid[0][1])' }
        const result = evaluate(grid, divideFunc)
        expect(result).toBe(Infinity) // 1 / 0 = Infinity in JavaScript
    })

    it('should evaluate logarithmic functions', () => {
        const grid = [[Math.E, 10, 100], [1000, 1, 2]]
        
        // Natural logarithm
        const logFunc = { expression: 'log(grid[0][0])' }
        expect(evaluate(grid, logFunc)).toBeCloseTo(1, 3) // ln(e) = 1, rounded to 3 decimal places
        
        // Base-10 logarithm
        const log10Func = { expression: 'log10(grid[0][2])' }
        expect(evaluate(grid, log10Func)).toBe(2) // log10(100) = 2
    })

    it('should evaluate rounding functions', () => {
        const grid = [[3.7, 3.2, -2.8], [4.5, -1.3, 0.1]]
        
        // Test round
        const roundFunc = { expression: 'round(grid[0][0])' }
        expect(evaluate(grid, roundFunc)).toBe(4) // round(3.7)
        
        // Test ceil
        const ceilFunc = { expression: 'ceil(grid[0][1])' }
        expect(evaluate(grid, ceilFunc)).toBe(4) // ceil(3.2)
        
        // Test floor
        const floorFunc = { expression: 'floor(grid[0][2])' }
        expect(evaluate(grid, floorFunc)).toBe(-3) // floor(-2.8)
    })

    it('should round results to 3 decimal places', () => {
        const grid = [[1, 3], [7, 11]]
        
        // Test division that results in repeating decimal
        const divideFunc = { expression: 'divide(grid[0][0], grid[0][1])' }
        const result = evaluate(grid, divideFunc)
        expect(result).toBe(0.333) // 1/3 = 0.333... rounded to 3 decimal places
        
        // Test another division
        const divide2Func = { expression: 'divide(grid[1][0], grid[1][1])' }
        const result2 = evaluate(grid, divide2Func)
        expect(result2).toBe(0.636) // 7/11 = 0.636... rounded to 3 decimal places
    })
})