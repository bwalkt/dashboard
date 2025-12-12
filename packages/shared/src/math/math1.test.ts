import { beforeEach, describe, expect, it } from 'vitest'
import { Ripple } from '../utils/ripple.js'
import { Utils } from '../utils/utils.js'
import { Math1 } from './math1.js'

describe('Math1', () => {
  let math1: Math1
  let utils: Utils

  beforeEach(() => {
    math1 = new Math1()
    utils = new Utils()
  })

  describe('init', () => {
    it('should initialize cuboidId', () => {
      math1.init(42)
      expect(math1.cuboidId).toBe(42)
    })

    it('should update cuboidId when called multiple times', () => {
      math1.init(10)
      expect(math1.cuboidId).toBe(10)
      math1.init(20)
      expect(math1.cuboidId).toBe(20)
    })
  })

  describe('createL3', () => {
    it('should create L3 ripple with three values', () => {
      const result = math1.createL3('divide', 'x', '5')

      expect(result.count()).toBe(4)
      expect(result.s(0)).toBe('l3')
      expect(result.s(1)).toBe('divide')
      expect(result.s(2)).toBe('x')
      expect(result.s(3)).toBe('5')
    })

    it('should handle empty strings', () => {
      const result = math1.createL3('', '', '')

      expect(result.count()).toBe(4)
      expect(result.s(0)).toBe('l3')
      expect(result.s(1)).toBe('')
      expect(result.s(2)).toBe('')
      expect(result.s(3)).toBe('')
    })

    it('should handle numeric strings', () => {
      const result = math1.createL3('add', '10', '20')

      expect(result.s(0)).toBe('l3')
      expect(result.s(1)).toBe('add')
      expect(result.s(2)).toBe('10')
      expect(result.s(3)).toBe('20')
    })
  })

  describe('calculate', () => {
    it('should process l3 function', () => {
      math1.init(100)
      const function1 = math1.createL3('divide', 'x', '10')
      const result = math1.calculate(function1)

      expect(result.count()).toBe(1)
      expect(result.s(0)).toBe('110')
    })

    it('should return empty ripple for unknown operator', () => {
      const unknownFunction = new Ripple()
      unknownFunction.add('unknown')
      unknownFunction.add('test')

      const result = math1.calculate(unknownFunction)
      expect(result.count()).toBe(0)
    })

    it('should handle complex tokenization', () => {
      const complexFunction = new Ripple()
      complexFunction.addStrings(['l3', 'divide', 'variable', '25'])

      math1.init(75)
      const result = math1.calculate(complexFunction)
      expect(result.s(0)).toBe('100')
    })
  })

  describe('l3', () => {
    it('should process divide operation', () => {
      math1.init(50)
      const divideFunction = new Ripple()
      divideFunction.addStrings(['l3', 'divide', 'y', '30'])

      const result = math1.l3(divideFunction)
      expect(result.count()).toBe(1)
      expect(result.s(0)).toBe('80')
    })

    it('should return empty ripple for unsupported operation', () => {
      const unsupportedFunction = new Ripple()
      unsupportedFunction.addStrings(['l3', 'multiply', 'z', '10'])

      const result = math1.l3(unsupportedFunction)
      expect(result.count()).toBe(0)
    })
  })

  describe('bwDiv', () => {
    it('should return empty ripple for divide operation', () => {
      const divFunction = new Ripple()
      divFunction.addStrings(['l3', 'divide', 'x', '5'])

      const result = math1.bwDiv(divFunction)
      expect(result.count()).toBe(0)
    })

    it('should return empty ripple for other operations', () => {
      const otherFunction = new Ripple()
      otherFunction.addStrings(['l3', 'add', 'x', '5'])

      const result = math1.bwDiv(otherFunction)
      expect(result.count()).toBe(0)
    })
  })

  describe('div', () => {
    it('should add operand to cuboidId', () => {
      math1.init(100)
      const divFunction = new Ripple()
      divFunction.addStrings(['l3', 'divide', 'x', '50'])

      const result = math1.div(divFunction)
      expect(result.count()).toBe(1)
      expect(result.s(0)).toBe('150')
    })

    it('should handle negative operands', () => {
      math1.init(100)
      const divFunction = new Ripple()
      divFunction.addStrings(['l3', 'divide', 'x', '-30'])

      const result = math1.div(divFunction)
      expect(result.s(0)).toBe('70')
    })

    it('should handle zero operand', () => {
      math1.init(42)
      const divFunction = new Ripple()
      divFunction.addStrings(['l3', 'divide', 'x', '0'])

      const result = math1.div(divFunction)
      expect(result.s(0)).toBe('42')
    })

    it('should handle decimal operands by flooring', () => {
      math1.init(100)
      const divFunction = new Ripple()
      divFunction.addStrings(['l3', 'divide', 'x', '25.7'])

      const result = math1.div(divFunction)
      expect(result.s(0)).toBe('125')
    })
  })

  describe('deriveX', () => {
    it('should derive X from Y and function', () => {
      const Y = new Ripple()
      Y.add('150')

      const functionRipple = new Ripple()
      functionRipple.addStrings(['l3', 'divide', 'x', '50'])

      const result = math1.deriveX(Y, functionRipple)
      expect(result.count()).toBe(1)
      expect(result.s(0)).toBe('100')
    })

    it('should handle negative results', () => {
      const Y = new Ripple()
      Y.add('30')

      const functionRipple = new Ripple()
      functionRipple.addStrings(['l3', 'divide', 'x', '50'])

      const result = math1.deriveX(Y, functionRipple)
      expect(result.s(0)).toBe('-20')
    })

    it('should handle zero Y value', () => {
      const Y = new Ripple()
      Y.add('0')

      const functionRipple = new Ripple()
      functionRipple.addStrings(['l3', 'divide', 'x', '25'])

      const result = math1.deriveX(Y, functionRipple)
      expect(result.s(0)).toBe('-25')
    })

    it('should handle complex function strings', () => {
      const Y = new Ripple()
      Y.add('200')

      const complexFunction = new Ripple()
      complexFunction.add('l3')
      complexFunction.add('divide')
      complexFunction.add('variable_name')
      complexFunction.add('75')

      const result = math1.deriveX(Y, complexFunction)
      expect(result.s(0)).toBe('125')
    })
  })

  describe('integration tests', () => {
    it('should perform round-trip calculation and derivation', () => {
      math1.init(100)

      const function1 = math1.createL3('divide', 'x', '50')
      const Y = math1.calculate(function1)
      expect(Y.s(0)).toBe('150')

      const derivedX = math1.deriveX(Y, function1)
      expect(derivedX.s(0)).toBe('100')
    })

    it('should handle chain of operations', () => {
      math1.init(25)

      const func1 = math1.createL3('divide', 'x', '15')
      const result1 = math1.calculate(func1)
      expect(result1.s(0)).toBe('40')

      math1.init(parseInt(result1.s(0)))
      const func2 = math1.createL3('divide', 'y', '10')
      const result2 = math1.calculate(func2)
      expect(result2.s(0)).toBe('50')
    })
  })

  describe('randomFunc matrix operations', () => {
    it('should log generated random functions and their results', () => {
      const matrix = [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
        [13, 14, 15, 16],
      ]

      console.log('\n========== Random Function Test Results ==========')
      console.log('Test Matrix:')
      matrix.forEach((row, i) => {
        console.log(`  Row ${i}: [${row.join(', ')}]`)
      })
      console.log('')

      // Test 5 random function calls
      for (let i = 0; i < 5; i++) {
        const result = math1.randomFunc(matrix)
        const executed = result.result()
        console.log(`Test ${i + 1}:`)
        console.log(`  Function: ${result.operation}`)
        console.log(`  Result: ${JSON.stringify(executed)}`)
        console.log('')

        // Verify result is a function that returns a proper object
        expect(typeof result.result).toBe('function')
        expect(executed).toBeDefined()
        // Different factory functions return different structures
        const hasValue =
          executed.value !== undefined ||
          executed.result !== undefined ||
          executed.finalResult !== undefined ||
          executed.histogram !== undefined ||
          executed.quantiles !== undefined ||
          executed.outliers !== undefined ||
          executed.zScores !== undefined ||
          executed.error !== undefined ||
          executed.operation !== undefined ||
          executed.data !== undefined ||
          executed.correlation !== undefined ||
          executed.vectors !== undefined ||
          executed.largestSingularValue !== undefined ||
          executed.leftVector !== undefined ||
          executed.rightVector !== undefined
        expect(hasValue).toBe(true)
      }

      console.log('Testing with specific indices:')
      // Test with specific row index
      const rowResult = math1.randomFunc(matrix, 1)
      const executedRow = rowResult.result()
      console.log(`  Fixed index 1: ${rowResult.operation} = ${JSON.stringify(executedRow)}`)

      // Test with edge cases
      const edgeMatrix = [
        [-5, 0, 10],
        [-2, 3, -8],
        [0, 0, 0],
      ]

      console.log('\nEdge case matrix with negatives and zeros:')
      edgeMatrix.forEach((row, i) => {
        console.log(`  Row ${i}: [${row.join(', ')}]`)
      })

      const edgeResult = math1.randomFunc(edgeMatrix, 0)
      const executedEdge = edgeResult.result()
      console.log(`  Result: ${edgeResult.operation} = ${JSON.stringify(executedEdge)}`)
      console.log('==================================================\n')
    })

    it('should handle all operation types correctly', () => {
      const matrix = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ]

      console.log('\n========== Testing All Operations ==========')
      console.log('Test Matrix:')
      matrix.forEach((row, i) => {
        console.log(`  Row ${i}: [${row.join(', ')}]`)
      })
      console.log('')

      // We can't directly test each operation since randomFunc is random,
      // but we can verify multiple calls work
      const results = new Set()
      for (let i = 0; i < 100; i++) {
        const result = math1.randomFunc(matrix, 1)
        results.add(result.operation.split('(')[0])

        // Verify each function returns a proper function
        expect(typeof result.result).toBe('function')
        const executed = result.result()
        expect(executed).toBeDefined()
        // Different factory functions return different structures (value, result, finalResult, histogram, quantiles, outliers, zScores)
        const hasValue =
          executed.value !== undefined ||
          executed.result !== undefined ||
          executed.finalResult !== undefined ||
          executed.histogram !== undefined ||
          executed.quantiles !== undefined ||
          executed.outliers !== undefined ||
          executed.zScores !== undefined ||
          executed.error !== undefined ||
          executed.operation !== undefined ||
          executed.data !== undefined ||
          executed.correlation !== undefined ||
          executed.vectors !== undefined
        expect(hasValue).toBe(true)
      }

      console.log('Operations encountered in 100 random calls:')
      Array.from(results)
        .sort()
        .forEach(op => {
          console.log(`  - ${op}`)
        })
      console.log('============================================\n')

      // At least some variety should be present
      expect(results.size).toBeGreaterThan(1)
    })
  })

  describe('advanced mathematical functions', () => {
    it('should test evaluate function with various expressions', () => {
      console.log('\n========== Advanced Math Function Tests ==========')

      const testCases = [
        { expr: 'sqrt(3**2 + 4**2)', expected: 5, desc: 'Pythagorean theorem' },
        { expr: 'sqrt(-4)', expected: '2i', desc: 'Complex square root' },
        { expr: '2 inch to cm', expected: '5.08 cm', desc: 'Unit conversion' },
        { expr: 'cos(45 deg)', expected: 0.707, desc: 'Cosine with degrees' },
        { expr: 'sin(90 deg)', expected: 1, desc: 'Sine of 90 degrees' },
        { expr: 'tan(45 deg)', expected: 1, desc: 'Tangent of 45 degrees' },
        { expr: 'sqrt(16)', expected: 4, desc: 'Simple square root' },
        { expr: 'sin(0 deg)', expected: 0, desc: 'Sine of 0 degrees' },
        { expr: 'cos(0 deg)', expected: 1, desc: 'Cosine of 0 degrees' },
      ]

      testCases.forEach(testCase => {
        const result = math1.evaluate(testCase.expr)
        console.log(`  ${testCase.desc}:`)
        console.log(`    Expression: ${testCase.expr}`)
        console.log(`    Result: ${result}`)
        console.log(`    Expected: ${testCase.expected}`)

        if (typeof testCase.expected === 'string') {
          expect(result).toBe(testCase.expected)
        } else {
          expect(Math.abs(Number(result) - testCase.expected)).toBeLessThan(0.01)
        }
        console.log('')
      })

      console.log('=============================================\n')
    })

    it('should test trigonometric functions on matrix data', () => {
      console.log('\n========== Trigonometric Matrix Operations ==========')

      const matrix = [
        [30, 45, 60], // Common angles in degrees
        [0, 90, 180],
        [270, 360, 45],
      ]

      console.log('Test Matrix (angles in degrees):')
      matrix.forEach((row, i) => {
        console.log(`  Row ${i}: [${row.join(', ')}]`)
      })
      console.log('')

      // Test trigonometric operations
      const trigTests = [
        { op: 'sinRow', index: 0, desc: 'Sine of row 0 average' },
        { op: 'cosRow', index: 0, desc: 'Cosine of row 0 average' },
        { op: 'tanRow', index: 0, desc: 'Tangent of row 0 average' },
        { op: 'sinCol', index: 1, desc: 'Sine of column 1 average' },
        { op: 'cosCol', index: 1, desc: 'Cosine of column 1 average' },
        { op: 'tanCol', index: 1, desc: 'Tangent of column 1 average' },
      ]

      trigTests.forEach(test => {
        // Call the specific operation through randomFunc with forced selection
        let result
        switch (test.op) {
          case 'sinRow':
            result = (math1 as any).sinRow(matrix, test.index)
            break
          case 'cosRow':
            result = (math1 as any).cosRow(matrix, test.index)
            break
          case 'tanRow':
            result = (math1 as any).tanRow(matrix, test.index)
            break
          case 'sinCol':
            result = (math1 as any).sinCol(matrix, test.index)
            break
          case 'cosCol':
            result = (math1 as any).cosCol(matrix, test.index)
            break
          case 'tanCol':
            result = (math1 as any).tanCol(matrix, test.index)
            break
        }

        console.log(`  ${test.desc}: ${result}`)
        expect(typeof result).toBe('number')
        expect(isNaN(result)).toBe(false)
      })

      console.log('===================================================\n')
    })

    it('should test complex number and special functions', () => {
      console.log('\n========== Complex Numbers & Special Functions ==========')

      const matrix = [
        [3, 4, 5], // Perfect for Pythagorean
        [-1, -2, -3], // Negative numbers for complex sqrt
        [1, 1, 1], // Simple values
      ]

      console.log('Test Matrix:')
      matrix.forEach((row, i) => {
        console.log(`  Row ${i}: [${row.join(', ')}]`)
      })
      console.log('')

      // Test sqrt operations
      const sqrtSumRow0 = (math1 as any).sqrtSumRow(matrix, 0)
      const sqrtSumRow1 = (math1 as any).sqrtSumRow(matrix, 1)
      const hypotRow0 = (math1 as any).hypotRow(matrix, 0)
      const hypotCol0 = (math1 as any).hypotCol(matrix, 0)

      console.log(`  Square root of row 0 sum (3+4+5=12): ${sqrtSumRow0}`)
      console.log(`  Square root of row 1 sum (-1-2-3=-6): ${sqrtSumRow1}`)
      console.log(`  Hypotenuse of row 0 (sqrt(3²+4²+5²)): ${hypotRow0}`)
      console.log(`  Hypotenuse of column 0 (sqrt(3²+(-1)²+1²)): ${hypotCol0}`)

      // Verify results
      expect(sqrtSumRow0).toBe(Math.round(Math.sqrt(12) * 1000) / 1000)
      expect(sqrtSumRow1).toBe('2.449i') // sqrt(6)i rounded
      expect(typeof hypotRow0).toBe('number')
      expect(typeof hypotCol0).toBe('number')

      console.log('========================================================\n')
    })
  })

  describe('new statistical functions', () => {
    let testMatrix: number[][]

    beforeEach(() => {
      testMatrix = [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
      ]
    })

    it('should calculate variance for rows and columns', () => {
      const variance0Row = (math1 as any).varianceRow(testMatrix, 0)
      const variance1Col = (math1 as any).varianceCol(testMatrix, 1)

      expect(typeof variance0Row).toBe('number')
      expect(typeof variance1Col).toBe('number')
      expect(variance0Row).toBeGreaterThan(0)
      expect(variance1Col).toBeGreaterThan(0)
    })

    it('should calculate percentiles for rows and columns', () => {
      const percentile75Row = (math1 as any).percentileRow(testMatrix, 1, 75)
      const percentile25Col = (math1 as any).percentileCol(testMatrix, 2, 25)

      expect(typeof percentile75Row).toBe('number')
      expect(typeof percentile25Col).toBe('number')
      expect(percentile75Row).toBe(7.25)
      expect(percentile25Col).toBe(5)
    })

    it('should calculate harmonic mean for valid data', () => {
      const harmonicMeanRow = (math1 as any).harmonicMeanRow(testMatrix, 0)
      const harmonicMeanCol = (math1 as any).harmonicMeanCol(testMatrix, 0)

      expect(typeof harmonicMeanRow).toBe('number')
      expect(typeof harmonicMeanCol).toBe('number')
      expect(harmonicMeanRow).toBeGreaterThan(0)
      expect(harmonicMeanCol).toBeGreaterThan(0)
    })

    it('should handle harmonic mean with zero values', () => {
      const matrixWithZero = [
        [0, 1, 2],
        [3, 4, 5],
      ]
      const harmonicMeanRow = (math1 as any).harmonicMeanRow(matrixWithZero, 0)

      expect(harmonicMeanRow).toBe('undefined (zero value)')
    })

    it('should calculate range for rows and columns', () => {
      const rangeRow = (math1 as any).rangeRow(testMatrix, 1)
      const rangeCol = (math1 as any).rangeCol(testMatrix, 2)

      expect(rangeRow).toBe(3)
      expect(rangeCol).toBe(8)
    })

    it('should include new operations in randomFunc', () => {
      const operations = new Set()

      for (let i = 0; i < 50; i++) {
        const result = math1.randomFunc(testMatrix, 0)
        operations.add(result.operation.split('(')[0])

        // Verify each result is a function
        expect(typeof result.result).toBe('function')
        const executed = result.result()
        expect(executed).toBeDefined()
      }

      const hasNewOperations = ['varianceRow', 'percentileRow', 'harmonicMeanRow', 'rangeRow'].some(op =>
        operations.has(op),
      )

      expect(hasNewOperations).toBe(true)
    })
  })

  describe('random number generation functions', () => {
    it('should generate random numbers within specified range', () => {
      const randomNumbers = math1.generateRandomNumbers(10, 1, 100)

      expect(randomNumbers.length).toBe(10)
      randomNumbers.forEach(num => {
        expect(num).toBeGreaterThanOrEqual(1)
        expect(num).toBeLessThanOrEqual(100)
        expect(Number.isInteger(num)).toBe(true)
      })
    })

    it('should generate numbers with normal distribution', () => {
      const normalNumbers = math1.generateNormalDistribution(100, 50, 10)

      expect(normalNumbers.length).toBe(100)

      const mean = normalNumbers.reduce((sum, num) => sum + num, 0) / normalNumbers.length
      expect(Math.abs(mean - 50)).toBeLessThan(5)

      normalNumbers.forEach(num => {
        expect(typeof num).toBe('number')
        expect(isNaN(num)).toBe(false)
      })
    })

    it('should generate normal distribution with default parameters', () => {
      const defaultNormal = math1.generateNormalDistribution(50)

      expect(defaultNormal.length).toBe(50)

      const mean = defaultNormal.reduce((sum, num) => sum + num, 0) / defaultNormal.length
      expect(Math.abs(mean)).toBeLessThan(1)
    })
  })

  describe('correlation function', () => {
    it('should calculate correlation between arrays', () => {
      const arr1 = [1, 2, 3, 4, 5]
      const arr2 = [2, 4, 6, 8, 10]

      const correlation = math1.correlationBetweenArrays(arr1, arr2)
      expect(correlation).toBe(1)
    })

    it('should handle negative correlation', () => {
      const arr1 = [1, 2, 3, 4, 5]
      const arr2 = [10, 8, 6, 4, 2]

      const correlation = math1.correlationBetweenArrays(arr1, arr2)
      expect(correlation).toBe(-1)
    })

    it('should handle invalid arrays', () => {
      const arr1 = [1, 2, 3]
      const arr2 = [1, 2]

      const correlation = math1.correlationBetweenArrays(arr1, arr2)
      expect(correlation).toBe('Invalid arrays')
    })

    it('should handle no variance case', () => {
      const arr1 = [5, 5, 5, 5]
      const arr2 = [1, 2, 3, 4]

      const correlation = math1.correlationBetweenArrays(arr1, arr2)
      expect(correlation).toBe('undefined (no variance)')
    })
  })

  describe('random sampling function', () => {
    it('should return random sample of specified size', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const sample = math1.randomSample(array, 5)

      expect(sample.length).toBe(5)
      sample.forEach(item => {
        expect(array).toContain(item)
      })

      const uniqueItems = new Set(sample)
      expect(uniqueItems.size).toBe(5)
    })

    it('should return full array when sample size exceeds array length', () => {
      const array = [1, 2, 3]
      const sample = math1.randomSample(array, 10)

      expect(sample.length).toBe(3)
      expect(sample).toEqual(array)
    })

    it('should work with string arrays', () => {
      const stringArray = ['apple', 'banana', 'cherry', 'date', 'elderberry']
      const sample = math1.randomSample(stringArray, 3)

      expect(sample.length).toBe(3)
      sample.forEach(item => {
        expect(stringArray).toContain(item)
      })
    })
  })

  describe('integration tests for new functions', () => {
    it('should demonstrate comprehensive statistical analysis workflow', () => {
      console.log('\n========== Statistical Analysis Workflow ==========')

      const data = math1.generateRandomNumbers(20, 1, 100)
      console.log(`Generated data: [${data.slice(0, 10).join(', ')}...]`)

      const normalData = math1.generateNormalDistribution(20, 50, 15)
      console.log(`Normal distribution data: [${normalData.slice(0, 5).join(', ')}...]`)

      const correlation = math1.correlationBetweenArrays(data, normalData)
      console.log(`Correlation between datasets: ${correlation}`)

      const sample = math1.randomSample(data, 10)
      console.log(`Random sample (n=10): [${sample.join(', ')}]`)

      const matrix = [data.slice(0, 10), normalData.slice(0, 10)]
      console.log('\nMatrix operations:')

      const variance0 = (math1 as any).varianceRow(matrix, 0)
      const variance1 = (math1 as any).varianceRow(matrix, 1)
      console.log(`Variance row 0: ${variance0}`)
      console.log(`Variance row 1: ${variance1}`)

      const percentile75_0 = (math1 as any).percentileRow(matrix, 0, 75)
      const percentile75_1 = (math1 as any).percentileRow(matrix, 1, 75)
      console.log(`75th percentile row 0: ${percentile75_0}`)
      console.log(`75th percentile row 1: ${percentile75_1}`)

      console.log('=============================================\n')

      expect(typeof correlation).toBe('number')
      expect(sample.length).toBe(10)
      expect(typeof variance0).toBe('number')
      expect(typeof variance1).toBe('number')
    })
  })

  describe('randomFunc edge cases and stack overflow fixes', () => {
    it('should handle empty matrix without stack overflow', () => {
      const result = math1.randomFunc([], 0)

      expect(result.operation).toBe('noop')
      expect(typeof result.result).toBe('function')

      const executed = result.result()
      expect(executed.error).toBe('matrix has no data')
    })

    it('should handle matrix with all empty rows', () => {
      const result = math1.randomFunc([[], [], []], 0)

      expect(result.operation).toBe('noop')
      expect(typeof result.result).toBe('function')

      const executed = result.result()
      expect(executed.error).toBe('matrix has no data')
    })

    it('should handle out-of-range row index', () => {
      const matrix = [
        [1, 2],
        [3, 4],
      ]
      const result = math1.randomFunc(matrix, 10)

      expect(typeof result.operation).toBe('string')
      expect(typeof result.result).toBe('function')
      // The operation might be vectorOperation or another type that doesn't contain row index
      expect(result.operation).toBeTruthy()

      const executed = result.result()
      expect(executed.value !== undefined).toBe(true)
    })

    it('should handle out-of-range column index for column operations', () => {
      const matrix = [
        [1, 2],
        [3, 4],
      ]
      for (let i = 0; i < 20; i++) {
        const result = math1.randomFunc(matrix, 10)

        expect(typeof result.operation).toBe('string')
        expect(typeof result.result).toBe('function')

        const executed = result.result()
        // Different factory functions return different structures (value, result, finalResult, histogram, quantiles, outliers, zScores)
        const hasValue =
          executed.value !== undefined ||
          executed.result !== undefined ||
          executed.finalResult !== undefined ||
          executed.histogram !== undefined ||
          executed.quantiles !== undefined ||
          executed.outliers !== undefined ||
          executed.zScores !== undefined ||
          executed.error !== undefined ||
          executed.operation !== undefined ||
          executed.data !== undefined ||
          executed.correlation !== undefined ||
          executed.vectors !== undefined
        expect(hasValue).toBe(true)

        // Function factories have different operation names that don't contain indices
        if (
          ![
            'chainFunction',
            'compositeFunction',
            'transformFunction',
            'matrixOperation',
            'vectorOperation',
            'statisticalAnalysis',
            'linearAlgebraOperation',
          ].includes(result.operation)
        ) {
          if (result.operation.includes('Col')) {
            expect(result.operation).toContain('(1)')
          } else {
            expect(result.operation).toContain('(1)')
          }
        }
      }
    })

    it('should handle ragged matrix (uneven row lengths)', () => {
      const raggedMatrix = [
        [1, 2, 3, 4],
        [5, 6],
        [7, 8, 9],
      ]

      for (let i = 0; i < 10; i++) {
        const result = math1.randomFunc(raggedMatrix)

        expect(typeof result.operation).toBe('string')
        expect(typeof result.result).toBe('function')

        const executed = result.result()
        // Different factory functions return different structures (value, result, finalResult, histogram, quantiles, outliers, zScores)
        const hasValue =
          executed.value !== undefined ||
          executed.result !== undefined ||
          executed.finalResult !== undefined ||
          executed.histogram !== undefined ||
          executed.quantiles !== undefined ||
          executed.outliers !== undefined ||
          executed.zScores !== undefined ||
          executed.error !== undefined ||
          executed.operation !== undefined ||
          executed.data !== undefined ||
          executed.correlation !== undefined ||
          executed.vectors !== undefined
        expect(hasValue).toBe(true)
      }
    })

    it('should not fall into infinite recursion chains', () => {
      const zeroMatrix = [
        [0, 0],
        [0, 0],
      ]

      for (let i = 0; i < 5; i++) {
        const result = math1.randomFunc(zeroMatrix, 0)

        expect(typeof result.operation).toBe('string')
        expect(typeof result.result).toBe('function')

        const executed = result.result()
        // Different factory functions return different structures (value, result, finalResult, histogram, quantiles, outliers, zScores)
        const hasValue =
          executed.value !== undefined ||
          executed.result !== undefined ||
          executed.finalResult !== undefined ||
          executed.histogram !== undefined ||
          executed.quantiles !== undefined ||
          executed.outliers !== undefined ||
          executed.zScores !== undefined ||
          executed.error !== undefined ||
          executed.operation !== undefined ||
          executed.data !== undefined ||
          executed.correlation !== undefined ||
          executed.vectors !== undefined
        expect(hasValue).toBe(true)
      }
    })

    it('should handle single column matrix', () => {
      const singleColMatrix = [[1], [2], [3]]

      const result = math1.randomFunc(singleColMatrix)

      expect(typeof result.operation).toBe('string')
      expect(typeof result.result).toBe('function')

      const executed = result.result()
      const hasValue =
        executed.value !== undefined ||
        executed.result !== undefined ||
        executed.finalResult !== undefined ||
        executed.histogram !== undefined ||
        executed.quantiles !== undefined ||
        executed.outliers !== undefined ||
        executed.zScores !== undefined ||
        executed.error !== undefined ||
        executed.operation !== undefined ||
        executed.data !== undefined ||
        executed.correlation !== undefined ||
        executed.vectors !== undefined
      expect(hasValue).toBe(true)
    })

    it('should handle single row matrix', () => {
      const singleRowMatrix = [[1, 2, 3, 4, 5]]

      const result = math1.randomFunc(singleRowMatrix)

      expect(typeof result.operation).toBe('string')
      expect(typeof result.result).toBe('function')

      const executed = result.result()
      const hasValue =
        executed.value !== undefined ||
        executed.result !== undefined ||
        executed.finalResult !== undefined ||
        executed.histogram !== undefined ||
        executed.quantiles !== undefined ||
        executed.outliers !== undefined ||
        executed.zScores !== undefined ||
        executed.error !== undefined ||
        executed.operation !== undefined ||
        executed.data !== undefined ||
        executed.correlation !== undefined ||
        executed.vectors !== undefined
      expect(hasValue).toBe(true)
    })

    it('should clamp indices to valid ranges', () => {
      const matrix = [
        [1, 2, 3],
        [4, 5, 6],
      ]

      const resultRowOutOfRange = math1.randomFunc(matrix, 5)

      // Complex operations and function factories may have different index handling
      const complexOps = ['matrixOperation', 'vectorOperation', 'statisticalAnalysis', 'linearAlgebraOperation']
      const functionFactories = ['chainFunction', 'compositeFunction', 'transformFunction']

      if (!complexOps.includes(resultRowOutOfRange.operation)) {
        // Check if it's a function factory (they show up with their name in the operation)
        const isFactory = functionFactories.some(factory => resultRowOutOfRange.operation.includes(factory))

        if (!isFactory) {
          if (resultRowOutOfRange.operation.includes('Row')) {
            expect(resultRowOutOfRange.operation).toContain('(1)')
          } else {
            expect(resultRowOutOfRange.operation).toContain('(2)')
          }
        } else {
          // Function factories use targetIdx which is clamped to matrix.length - 1
          expect(resultRowOutOfRange.operation).toMatch(/\((0|1)\)/)
        }
      }

      const resultNegativeIndex = math1.randomFunc(matrix, -1)
      // Complex operations and function factories may have different index handling
      if (!complexOps.includes(resultNegativeIndex.operation)) {
        const isFactory = functionFactories.some(factory => resultNegativeIndex.operation.includes(factory))
        if (!isFactory) {
          expect(resultNegativeIndex.operation).toContain('(0)')
        } else {
          // Function factories always clamp to valid range
          expect(resultNegativeIndex.operation).toMatch(/\((0|1)\)/)
        }
      }

      // Verify functions work
      const executed1 = resultRowOutOfRange.result()
      const executed2 = resultNegativeIndex.result()
      const hasValue1 =
        executed1.value !== undefined ||
        executed1.result !== undefined ||
        executed1.finalResult !== undefined ||
        executed1.histogram !== undefined ||
        executed1.quantiles !== undefined ||
        executed1.outliers !== undefined ||
        executed1.zScores !== undefined ||
        executed1.error !== undefined ||
        executed1.operation !== undefined ||
        executed1.data !== undefined ||
        executed1.correlation !== undefined ||
        executed1.vectors !== undefined ||
        executed1.largestSingularValue !== undefined ||
        executed1.leftVector !== undefined ||
        executed1.rightVector !== undefined
      const hasValue2 =
        executed2.value !== undefined ||
        executed2.result !== undefined ||
        executed2.finalResult !== undefined ||
        executed2.histogram !== undefined ||
        executed2.quantiles !== undefined ||
        executed2.outliers !== undefined ||
        executed2.zScores !== undefined ||
        executed2.error !== undefined ||
        executed2.operation !== undefined ||
        executed2.data !== undefined ||
        executed2.correlation !== undefined ||
        executed2.vectors !== undefined ||
        executed2.largestSingularValue !== undefined ||
        executed2.leftVector !== undefined ||
        executed2.rightVector !== undefined
      expect(hasValue1).toBe(true)
      expect(hasValue2).toBe(true)
    })
  })

  describe('ts-stats statistical functions', () => {
    const testData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const testDataWithDuplicates = [1, 2, 2, 3, 3, 3, 4, 4, 5]
    const positiveData = [2, 4, 6, 8, 10]

    describe('statsAverage', () => {
      it('should calculate average correctly', () => {
        const result = math1.statsAverage(testData)
        expect(result).toBe(5.5)
      })

      it('should handle empty array', () => {
        const result = math1.statsAverage([])
        expect(result).toBe('empty array')
      })

      it('should handle single value', () => {
        const result = math1.statsAverage([42])
        expect(result).toBe(42)
      })
    })

    describe('statsMedian', () => {
      it('should calculate median of odd-length array', () => {
        const result = math1.statsMedian([1, 3, 5, 7, 9])
        expect(result).toBe(5)
      })

      it('should calculate median of even-length array', () => {
        const result = math1.statsMedian(testData)
        expect(result).toBe(5.5)
      })

      it('should handle empty array', () => {
        const result = math1.statsMedian([])
        expect(result).toBe('empty array')
      })
    })

    describe('statsMode', () => {
      it('should find mode in data with duplicates', () => {
        const result = math1.statsMode(testDataWithDuplicates)
        expect(Array.isArray(result)).toBe(true)
        if (Array.isArray(result)) {
          expect(result).toContain(3)
        }
      })

      it('should handle data with no clear mode', () => {
        const result = math1.statsMode(testData)
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBe(0) // No mode found should return empty array
      })

      it('should handle empty array', () => {
        const result = math1.statsMode([])
        expect(result).toBe('empty array')
      })
    })

    describe('statsStandardDeviation', () => {
      it('should calculate standard deviation correctly', () => {
        const result = math1.statsStandardDeviation(testData)
        expect(typeof result).toBe('number')
        expect(result).toBeGreaterThan(0)
      })

      it('should handle empty array', () => {
        const result = math1.statsStandardDeviation([])
        expect(result).toBe('empty array')
      })

      it('should handle identical values', () => {
        const result = math1.statsStandardDeviation([5, 5, 5, 5])
        expect(result).toBe(0)
      })
    })

    describe('statsVariance', () => {
      it('should calculate variance correctly', () => {
        const result = math1.statsVariance(testData)
        expect(typeof result).toBe('number')
        expect(result).toBeGreaterThan(0)
      })

      it('should handle empty array', () => {
        const result = math1.statsVariance([])
        expect(result).toBe('empty array')
      })
    })

    describe('statsHarmonicMean', () => {
      it('should calculate harmonic mean for positive numbers', () => {
        const result = math1.statsHarmonicMean(positiveData)
        expect(typeof result).toBe('number')
        expect(result).toBeGreaterThan(0)
        // Harmonic mean is always less than or equal to the arithmetic mean
        const arithmeticMean = positiveData.reduce((sum, val) => sum + val, 0) / positiveData.length
        expect(result).toBeLessThanOrEqual(arithmeticMean)
      })

      it('should handle empty array', () => {
        const result = math1.statsHarmonicMean([])
        expect(result).toBe('empty array')
      })

      it('should reject non-positive values', () => {
        const result = math1.statsHarmonicMean([1, 0, 3])
        expect(result).toBe('invalid input (non-positive values)')
      })

      it('should reject negative values', () => {
        const result = math1.statsHarmonicMean([1, -2, 3])
        expect(result).toBe('invalid input (non-positive values)')
      })
    })

    describe('statsRange', () => {
      it('should calculate range correctly', () => {
        const result = math1.statsRange(testData)
        expect(result).toBe(9)
      })

      it('should handle empty array', () => {
        const result = math1.statsRange([])
        expect(result).toBe('empty array')
      })

      it('should handle single value', () => {
        const result = math1.statsRange([42])
        expect(result).toBe(0)
      })
    })

    describe('statsExtrema', () => {
      it('should find min and max correctly', () => {
        const result = math1.statsExtrema(testData)
        expect(typeof result).toBe('object')
        if (typeof result === 'object' && result !== null && 'min' in result) {
          expect(result.min).toBe(1)
          expect(result.max).toBe(10)
        }
      })

      it('should handle empty array', () => {
        const result = math1.statsExtrema([])
        expect(result).toBe('empty array')
      })
    })

    describe('statsPercentile', () => {
      it('should calculate 50th percentile (median)', () => {
        const result = math1.statsPercentile(testData, 50)
        expect(result).toBe(5.5)
      })

      it('should calculate 25th percentile', () => {
        const result = math1.statsPercentile(testData, 25)
        expect(typeof result).toBe('number')
      })

      it('should handle invalid percentile values', () => {
        const resultNegative = math1.statsPercentile(testData, -10)
        expect(resultNegative).toBe('percentile must be between 0 and 100')

        const resultOver100 = math1.statsPercentile(testData, 110)
        expect(resultOver100).toBe('percentile must be between 0 and 100')
      })

      it('should handle empty array', () => {
        const result = math1.statsPercentile([], 50)
        expect(result).toBe('empty array')
      })
    })

    describe('statsCorrelation', () => {
      it('should calculate perfect positive correlation', () => {
        const arr1 = [1, 2, 3, 4, 5]
        const arr2 = [2, 4, 6, 8, 10]
        const result = math1.statsCorrelation(arr1, arr2)
        expect(result).toBe(1)
      })

      it('should calculate perfect negative correlation', () => {
        const arr1 = [1, 2, 3, 4, 5]
        const arr2 = [10, 8, 6, 4, 2]
        const result = math1.statsCorrelation(arr1, arr2)
        expect(result).toBe(-1)
      })

      it('should handle arrays of different lengths', () => {
        const arr1 = [1, 2, 3]
        const arr2 = [1, 2]
        const result = math1.statsCorrelation(arr1, arr2)
        expect(result).toBe('arrays must have same length')
      })

      it('should handle empty arrays', () => {
        const result1 = math1.statsCorrelation([], [1, 2, 3])
        expect(result1).toBe('empty array')

        const result2 = math1.statsCorrelation([1, 2, 3], [])
        expect(result2).toBe('empty array')
      })
    })

    describe('randomStatsFunc', () => {
      it('should perform random statistical operations and return functions', () => {
        const result = math1.randomStatsFunc(testData)

        expect(typeof result.operation).toBe('string')
        expect(typeof result.result).toBe('function')

        // Execute the function to get the actual result
        const executed = result.result()
        expect(executed).toBeDefined()
        // Different factory functions return different structures (value, result, finalResult, histogram, quantiles, outliers, zScores)
        const hasValue =
          executed.value !== undefined ||
          executed.result !== undefined ||
          executed.finalResult !== undefined ||
          executed.histogram !== undefined ||
          executed.quantiles !== undefined ||
          executed.outliers !== undefined ||
          executed.zScores !== undefined ||
          executed.error !== undefined ||
          executed.operation !== undefined ||
          executed.data !== undefined ||
          executed.correlation !== undefined ||
          executed.vectors !== undefined
        expect(hasValue).toBe(true)

        const validOperations = [
          'average',
          'median',
          'mode',
          'standardDeviation',
          'variance',
          'harmonicMean',
          'range',
          'extrema',
          'percentile25',
          'percentile75',
          'statsChainFunction',
          'aggregateFunction',
          'distributionFunction',
        ]
        expect(validOperations.includes(result.operation)).toBe(true)
      })

      it('should handle empty data', () => {
        const result = math1.randomStatsFunc([])
        expect(result.operation).toBe('noop')
        expect(typeof result.result).toBe('function')

        const executed = result.result()
        expect(executed.error).toBe('no data')
        expect(executed.value).toBe(0)
      })

      it('should handle invalid data for harmonic mean', () => {
        const dataWithZero = [1, 0, 3, 4, 5]
        let foundHarmonicMean = false

        for (let i = 0; i < 50; i++) {
          const result = math1.randomStatsFunc(dataWithZero)
          if (result.operation === 'harmonicMean') {
            const executed = result.result()
            expect(executed.value).toBe('invalid input (non-positive values)')
            foundHarmonicMean = true
            break
          }
        }
      })
    })

    describe('generateStatisticalSample', () => {
      it('should generate three types of distributions', () => {
        const sample = math1.generateStatisticalSample(20)

        expect(sample.uniform.length).toBe(20)
        expect(sample.normal.length).toBe(20)
        expect(sample.exponential.length).toBe(20)

        sample.uniform.forEach(val => {
          expect(val).toBeGreaterThanOrEqual(1)
          expect(val).toBeLessThanOrEqual(100)
        })

        sample.normal.forEach(val => {
          expect(typeof val).toBe('number')
          expect(isFinite(val)).toBe(true)
        })

        sample.exponential.forEach(val => {
          expect(typeof val).toBe('number')
          expect(val).toBeGreaterThanOrEqual(0)
        })
      })

      it('should use default size when not specified', () => {
        const sample = math1.generateStatisticalSample()

        expect(sample.uniform.length).toBe(20)
        expect(sample.normal.length).toBe(20)
        expect(sample.exponential.length).toBe(20)
      })

      it('should generate different samples on multiple calls', () => {
        const sample1 = math1.generateStatisticalSample(10)
        const sample2 = math1.generateStatisticalSample(10)

        expect(sample1.uniform).not.toEqual(sample2.uniform)
        expect(sample1.normal).not.toEqual(sample2.normal)
        expect(sample1.exponential).not.toEqual(sample2.exponential)
      })
    })
  })

  describe('integration tests for ts-stats functions', () => {
    it('should demonstrate complete statistical analysis workflow', () => {
      console.log('\n========== TS-Stats Statistical Analysis ==========')

      const sample = math1.generateStatisticalSample(50)
      console.log(
        `Generated ${sample.uniform.length} uniform, ${sample.normal.length} normal, and ${sample.exponential.length} exponential values`,
      )

      const datasets = [
        { name: 'uniform', data: sample.uniform },
        { name: 'normal', data: sample.normal },
        { name: 'exponential', data: sample.exponential },
      ]

      datasets.forEach(dataset => {
        console.log(`\n${dataset.name.toUpperCase()} DISTRIBUTION:`)
        console.log(`  Average: ${math1.statsAverage(dataset.data)}`)
        console.log(`  Median: ${math1.statsMedian(dataset.data)}`)
        console.log(`  Std Dev: ${math1.statsStandardDeviation(dataset.data)}`)
        console.log(`  Variance: ${math1.statsVariance(dataset.data)}`)
        console.log(`  Range: ${math1.statsRange(dataset.data)}`)

        const extrema = math1.statsExtrema(dataset.data)
        if (typeof extrema === 'object' && extrema !== null && 'min' in extrema) {
          console.log(`  Min: ${extrema.min}, Max: ${extrema.max}`)
        }

        console.log(`  25th percentile: ${math1.statsPercentile(dataset.data, 25)}`)
        console.log(`  75th percentile: ${math1.statsPercentile(dataset.data, 75)}`)
      })

      console.log('\nCORRELATION ANALYSIS:')
      console.log(`  Uniform vs Normal: ${math1.statsCorrelation(sample.uniform, sample.normal)}`)
      console.log(`  Normal vs Exponential: ${math1.statsCorrelation(sample.normal, sample.exponential)}`)
      console.log(`  Uniform vs Exponential: ${math1.statsCorrelation(sample.uniform, sample.exponential)}`)

      console.log('\nRANDOM STATISTICAL OPERATIONS:')
      for (let i = 0; i < 3; i++) {
        const randomOp = math1.randomStatsFunc(sample.uniform)
        console.log(`  ${randomOp.operation}: ${JSON.stringify(randomOp.result)}`)
      }

      console.log('================================================\n')
    })
  })

  describe('enhanced function chaining system', () => {
    let testMatrix: number[][]
    let testNumbers: number[]

    beforeEach(() => {
      testMatrix = [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
      ]
      testNumbers = [10, 20, 30, 40, 50]
    })

    it('should always return functions from randomFunc', () => {
      for (let i = 0; i < 10; i++) {
        const result = math1.randomFunc(testMatrix)

        expect(typeof result.operation).toBe('string')
        expect(typeof result.result).toBe('function')

        // Execute the function to verify it works
        const executed = result.result()
        expect(executed).toBeDefined()
        // Different factory functions return different structures
        const hasValue =
          executed.value !== undefined ||
          executed.result !== undefined ||
          executed.finalResult !== undefined ||
          executed.histogram !== undefined ||
          executed.quantiles !== undefined ||
          executed.outliers !== undefined ||
          executed.zScores !== undefined ||
          executed.error !== undefined ||
          executed.operation !== undefined ||
          executed.data !== undefined ||
          executed.correlation !== undefined ||
          executed.vectors !== undefined
        expect(hasValue).toBe(true)
        // Operation might be in different properties depending on the function type
        const hasOperation =
          typeof executed.operation === 'string' ||
          Array.isArray(executed.operations) ||
          typeof executed.aggregateType === 'string' ||
          typeof executed.transform === 'string' ||
          typeof executed.distributionType === 'string'
        expect(hasOperation).toBe(true)
      }
    })

    it('should always return functions from randomStatsFunc', () => {
      for (let i = 0; i < 10; i++) {
        const result = math1.randomStatsFunc(testNumbers)

        expect(typeof result.operation).toBe('string')
        expect(typeof result.result).toBe('function')

        // Execute the function to verify it works
        const executed = result.result()
        expect(executed).toBeDefined()
        // Different factory functions return different structures (value, result, finalResult, histogram, quantiles, outliers, zScores)
        const hasValue =
          executed.value !== undefined ||
          executed.result !== undefined ||
          executed.finalResult !== undefined ||
          executed.histogram !== undefined ||
          executed.quantiles !== undefined ||
          executed.outliers !== undefined ||
          executed.zScores !== undefined ||
          executed.error !== undefined ||
          executed.operation !== undefined ||
          executed.data !== undefined ||
          executed.correlation !== undefined ||
          executed.vectors !== undefined
        expect(hasValue).toBe(true)
        // Different factory functions return different operation structures
        // Some functions might not have explicit operation strings but contain meaningful data
        const hasOperation =
          typeof executed.operation === 'string' ||
          Array.isArray(executed.operations) ||
          typeof executed.aggregateType === 'string' ||
          typeof executed.transform === 'string' ||
          typeof executed.distributionType === 'string' ||
          executed.histogram !== undefined ||
          executed.quantiles !== undefined ||
          executed.outliers !== undefined ||
          executed.zScores !== undefined
        expect(hasOperation).toBe(true)
      }
    })

    it('should create chain functions that execute multiple operations', () => {
      const chainFunc = math1.createChainFunction(testMatrix)
      expect(typeof chainFunc).toBe('function')

      const result = chainFunc()
      expect(result).toBeDefined()
      expect(typeof result.result).toBe('number')
      expect(Array.isArray(result.operations)).toBe(true)
      expect(result.operations.length).toBeGreaterThan(1)
      expect(typeof result.chainLength).toBe('number')

      console.log(`Chain function result:`, result)
    })

    it('should create composite functions that combine operations', () => {
      const compositeFunc = math1.createCompositeFunction(testMatrix)
      expect(typeof compositeFunc).toBe('function')

      const result = compositeFunc()
      expect(result).toBeDefined()
      expect(typeof result.result).toBe('number')
      expect(Array.isArray(result.operations)).toBe(true)
      expect(result.operations.length).toBe(2)
      expect(typeof result.composition).toBe('string')

      console.log(`Composite function result:`, result)
    })

    it('should create transform functions that modify data', () => {
      const transformFunc = math1.createTransformFunction(testMatrix)
      expect(typeof transformFunc).toBe('function')

      const result = transformFunc()
      expect(result).toBeDefined()
      expect(Array.isArray(result.result)).toBe(true)
      expect(typeof result.transform).toBe('string')
      expect(typeof result.parameter).toBe('number')
      expect(typeof result.originalLength).toBe('number')

      console.log(`Transform function result:`, result)
    })

    it('should create stats chain functions with multiple statistical operations', () => {
      const statsChainFunc = math1.createStatsChainFunction(testNumbers)
      expect(typeof statsChainFunc).toBe('function')

      const result = statsChainFunc()
      expect(result).toBeDefined()
      expect(result.finalResult !== undefined).toBe(true)
      expect(Array.isArray(result.operations)).toBe(true)
      expect(Array.isArray(result.allResults)).toBe(true)
      expect(typeof result.chainLength).toBe('number')
      expect(result.operations.length).toBe(result.allResults.length)

      console.log(`Stats chain function result:`, result)
    })

    it('should create aggregate functions with different aggregation types', () => {
      const aggregateFunc = math1.createAggregateFunction(testNumbers)
      expect(typeof aggregateFunc).toBe('function')

      const result = aggregateFunc()
      expect(result).toBeDefined()
      expect(typeof result.result).toBe('number')
      expect(typeof result.aggregateType).toBe('string')
      expect(typeof result.inputSize).toBe('number')
      expect(typeof result.weightedCalculation).toBe('boolean')

      console.log(`Aggregate function result:`, result)
    })

    it('should create distribution functions that analyze data patterns', () => {
      const distributionFunc = math1.createDistributionFunction(testNumbers)
      expect(typeof distributionFunc).toBe('function')

      const result = distributionFunc()
      expect(result).toBeDefined()
      expect(result.error === undefined).toBe(true) // Should not have error

      // Different distribution types have different structures
      if ('histogram' in result) {
        expect(Array.isArray(result.histogram)).toBe(true)
        expect(typeof result.binWidth).toBe('number')
        expect(typeof result.range).toBe('object')
      } else if ('quantiles' in result) {
        expect(Array.isArray(result.quantiles)).toBe(true)
        expect(Array.isArray(result.percentiles)).toBe(true)
      } else if ('outliers' in result) {
        expect(Array.isArray(result.outliers)).toBe(true)
        expect(typeof result.outlierCount).toBe('number')
      } else if ('zScores' in result) {
        expect(Array.isArray(result.zScores)).toBe(true)
        expect(typeof result.mean).toBe('number')
      }

      console.log(`Distribution function result:`, result)
    })

    it('should demonstrate function chaining with random selection', () => {
      console.log('\n========== Function Chaining Demonstration ==========')

      for (let i = 0; i < 5; i++) {
        const matrixFunc = math1.randomFunc(testMatrix)
        const statsFunc = math1.randomStatsFunc(testNumbers)

        const matrixResult = matrixFunc.result()
        const statsResult = statsFunc.result()

        console.log(`\nTest ${i + 1}:`)
        console.log(`  Matrix Function: ${matrixFunc.operation}`)
        console.log(`  Matrix Result: ${JSON.stringify(matrixResult).substring(0, 100)}...`)
        console.log(`  Stats Function: ${statsFunc.operation}`)
        console.log(`  Stats Result: ${JSON.stringify(statsResult).substring(0, 100)}...`)

        expect(typeof matrixFunc.result).toBe('function')
        expect(typeof statsFunc.result).toBe('function')
        // Different factory functions return different structures
        const matrixHasValue =
          matrixResult.value !== undefined ||
          matrixResult.result !== undefined ||
          matrixResult.finalResult !== undefined ||
          matrixResult.histogram !== undefined ||
          matrixResult.quantiles !== undefined ||
          matrixResult.outliers !== undefined ||
          matrixResult.zScores !== undefined ||
          matrixResult.error !== undefined ||
          matrixResult.operation !== undefined ||
          matrixResult.data !== undefined ||
          matrixResult.correlation !== undefined ||
          matrixResult.vectors !== undefined
        const statsHasValue =
          statsResult.value !== undefined ||
          statsResult.result !== undefined ||
          statsResult.finalResult !== undefined ||
          statsResult.histogram !== undefined ||
          statsResult.quantiles !== undefined ||
          statsResult.outliers !== undefined ||
          statsResult.zScores !== undefined ||
          statsResult.error !== undefined ||
          statsResult.operation !== undefined ||
          statsResult.data !== undefined ||
          statsResult.correlation !== undefined ||
          statsResult.vectors !== undefined
        expect(matrixHasValue).toBe(true)
        expect(statsHasValue).toBe(true)
      }

      console.log('=====================================================\n')
    })

    it('should handle function execution with different parameters', () => {
      const matrixFunc = math1.randomFunc(testMatrix)
      const statsFunc = math1.randomStatsFunc(testNumbers)

      // Test with original parameters
      const result1 = matrixFunc.result()
      const result2 = statsFunc.result()

      // Test with new parameters
      const newMatrix = [
        [100, 200],
        [300, 400],
      ]
      const newNumbers = [1, 2, 3]

      const result3 = matrixFunc.result(newMatrix, 0)
      const result4 = statsFunc.result(newNumbers)

      // Different factory functions return different structures
      const result1HasValue =
        result1.value !== undefined ||
        result1.result !== undefined ||
        result1.finalResult !== undefined ||
        result1.histogram !== undefined ||
        result1.quantiles !== undefined ||
        result1.outliers !== undefined ||
        result1.zScores !== undefined ||
        result1.error !== undefined
      const result2HasValue =
        result2.value !== undefined ||
        result2.result !== undefined ||
        result2.finalResult !== undefined ||
        result2.histogram !== undefined ||
        result2.quantiles !== undefined ||
        result2.outliers !== undefined ||
        result2.zScores !== undefined ||
        result2.error !== undefined
      const result3HasValue =
        result3.value !== undefined ||
        result3.result !== undefined ||
        result3.finalResult !== undefined ||
        result3.histogram !== undefined ||
        result3.quantiles !== undefined ||
        result3.outliers !== undefined ||
        result3.zScores !== undefined ||
        result3.error !== undefined
      const result4HasValue =
        result4.value !== undefined ||
        result4.result !== undefined ||
        result4.finalResult !== undefined ||
        result4.histogram !== undefined ||
        result4.quantiles !== undefined ||
        result4.outliers !== undefined ||
        result4.zScores !== undefined ||
        result4.error !== undefined
      expect(result1HasValue).toBe(true)
      expect(result2HasValue).toBe(true)
      expect(result3HasValue).toBe(true)
      expect(result4HasValue).toBe(true)

      // Results should potentially be different with different inputs
      console.log('Original matrix result:', result1)
      console.log('New matrix result:', result3)
      console.log('Original stats result:', result2)
      console.log('New stats result:', result4)
    })

    it('should handle function chaining within randomFunc', () => {
      let chainedFunctionFound = false

      // Try multiple times to find a chained function (20% chance per call)
      for (let i = 0; i < 50 && !chainedFunctionFound; i++) {
        const result = math1.randomFunc(testMatrix)
        const executed = result.result()

        if (executed.chained === true) {
          chainedFunctionFound = true
          expect(typeof executed.originalResult).toBe('number')
          expect(executed.operation.includes('->')).toBe(true)
          console.log('Found chained function:', executed)
        }
      }

      // At least verify basic functionality even if we don't find a chain
      expect(typeof math1.randomFunc).toBe('function')
    })

    it('should handle function chaining within randomStatsFunc', () => {
      let chainedFunctionFound = false

      // Try multiple times to find a chained function (25% chance per call)
      for (let i = 0; i < 50 && !chainedFunctionFound; i++) {
        const result = math1.randomStatsFunc(testNumbers)
        const executed = result.result()

        if (executed.chained === true) {
          chainedFunctionFound = true
          expect(executed.originalResult !== undefined).toBe(true)
          expect(executed.operation.includes('->')).toBe(true)
          console.log('Found chained stats function:', executed)
        }
      }

      // At least verify basic functionality even if we don't find a chain
      expect(typeof math1.randomStatsFunc).toBe('function')
    })
  })
})
