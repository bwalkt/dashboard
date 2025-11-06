import { beforeEach, describe, expect, it } from 'vitest'
import { Ripple } from '../utils/ripple'
import { Utils } from '../utils/utils'
import { Math1 } from './math1'

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
        [13, 14, 15, 16]
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
        console.log(`Test ${i + 1}:`)
        console.log(`  Function: ${result.operation}`)
        console.log(`  Result: ${result.result}`)
        console.log('')
        
        // Verify result is a number or string
        expect(['number', 'string'].includes(typeof result.result)).toBe(true)
        if (typeof result.result === 'number') {
          expect(isNaN(result.result)).toBe(false)
        }
      }

      console.log('Testing with specific indices:')
      // Test with specific row index
      const rowResult = math1.randomFunc(matrix, 1)
      console.log(`  Fixed index 1: ${rowResult.operation} = ${rowResult.result}`)
      
      // Test with edge cases
      const edgeMatrix = [
        [-5, 0, 10],
        [-2, 3, -8],
        [0, 0, 0]
      ]
      
      console.log('\nEdge case matrix with negatives and zeros:')
      edgeMatrix.forEach((row, i) => {
        console.log(`  Row ${i}: [${row.join(', ')}]`)
      })
      
      const edgeResult = math1.randomFunc(edgeMatrix, 0)
      console.log(`  Result: ${edgeResult.operation} = ${edgeResult.result}`)
      console.log('==================================================\n')
    })

    it('should handle all operation types correctly', () => {
      const matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
      
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
      }
      
      console.log('Operations encountered in 100 random calls:')
      Array.from(results).sort().forEach(op => {
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
        { expr: 'cos(0 deg)', expected: 1, desc: 'Cosine of 0 degrees' }
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
        [30, 45, 60],  // Common angles in degrees
        [0, 90, 180],
        [270, 360, 45]
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
        { op: 'tanCol', index: 1, desc: 'Tangent of column 1 average' }
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
        [3, 4, 5],      // Perfect for Pythagorean
        [-1, -2, -3],   // Negative numbers for complex sqrt
        [1, 1, 1]       // Simple values
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
      expect(sqrtSumRow1).toBe('2.449i')  // sqrt(6)i rounded
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
        [9, 10, 11, 12]
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
      const matrixWithZero = [[0, 1, 2], [3, 4, 5]]
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
      }
      
      const hasNewOperations = ['varianceRow', 'percentileRow', 'harmonicMeanRow', 'rangeRow']
        .some(op => operations.has(op))
      
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
})
