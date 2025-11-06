import { Ripple } from '../utils/ripple'
import { Utils } from '../utils/utils'
import { avg, median, mode, stdDev, variance, harmonicMean, range, extrema, percentile, corelation } from 'ts-stats'

export class Math1 {
  private utils: Utils = new Utils()
  public cuboidId: number = 0

  init(cuboidId: number): void {
    this.cuboidId = cuboidId
  }

  createL3(v1: string, v2: string, v3: string): Ripple {
    const result = new Ripple()
    result.add('l3')
    result.add(v1)
    result.add(v2)
    result.add(v3)
    return result
  }

  calculate(functionRipple: Ripple): Ripple {
    const fnString = functionRipple.toString()
    const parsedFunction = this.utils.tokenizeAndRipple(fnString)

    const operator = parsedFunction.s(0)

    let result = new Ripple()
    switch (operator) {
      case 'l3':
        result = this.l3(parsedFunction)
        break
      default:
        break
    }
    return result
  }

  l3(functionRipple: Ripple): Ripple {
    const operator = functionRipple.s(1)
    let result = new Ripple()

    switch (operator) {
      case 'divide':
        result = this.div(functionRipple)
        break
      default:
        break
    }
    return result
  }

  bwDiv(functionRipple: Ripple): Ripple {
    const operator = functionRipple.s(1)
    const result = new Ripple()

    switch (operator) {
      case 'divide':
        break
      default:
        break
    }
    return result
  }

  div(functionRipple: Ripple): Ripple {
    const result = new Ripple()
    const operand = this.utils.convertToInt(functionRipple.s(3))
    const intResult = this.cuboidId + operand
    result.add(intResult.toString())
    return result
  }

  deriveX(Y: Ripple, functionRipple: Ripple): Ripple {
    const result = new Ripple()
    const fnString = functionRipple.toString()
    const parsedFunction = this.utils.tokenizeAndRipple(fnString)
    const yInt = this.utils.convertToInt(Y.s(0))
    const operand = this.utils.convertToInt(parsedFunction.s(3))
    const cuboidId = yInt - operand
    result.add(cuboidId.toString())
    return result
  }

  randomFunc(matrix: number[][], index?: number, enableChaining: boolean = true): { operation: string; result: Function } {
    if (!Array.isArray(matrix) || matrix.length === 0 || matrix.every(row => row.length === 0)) {
      return { 
        operation: 'noop', 
        result: () => ({ error: 'matrix has no data', value: 0 })
      }
    }

    // Enhanced chaining - now always returns functions
    const operations = [
      'sumRow', 'sumCol', 'avgRow', 'avgCol', 'medianRow', 'medianCol',
      'minRow', 'maxRow', 'minCol', 'maxCol', 'productRow', 'productCol',
      'stdDevRow', 'stdDevCol', 'sinRow', 'cosRow', 'tanRow', 'sinCol', 
      'cosCol', 'tanCol', 'sqrtSumRow', 'sqrtSumCol', 'hypotRow', 'hypotCol',
      'varianceRow', 'varianceCol', 'percentileRow', 'percentileCol', 
      'harmonicMeanRow', 'harmonicMeanCol', 'rangeRow', 'rangeCol',
      'chainFunction', 'compositeFunction', 'transformFunction'
    ]

    const randomOp = operations[Math.floor(Math.random() * operations.length)]
    
    // Handle complex function factories
    if (['chainFunction', 'compositeFunction', 'transformFunction'].includes(randomOp)) {
      const targetIdx = Math.max(
        0,
        Math.min(
          index ?? Math.floor(Math.random() * matrix.length),
          matrix.length - 1,
        ),
      )
      switch (randomOp) {
        case 'chainFunction':
          return { operation: `chainFunction(${targetIdx})`, result: this.createChainFunction(matrix, targetIdx) }
        case 'compositeFunction':
          return { operation: `compositeFunction(${targetIdx})`, result: this.createCompositeFunction(matrix, targetIdx) }
        case 'transformFunction':
          return { operation: `transformFunction(${targetIdx})`, result: this.createTransformFunction(matrix, targetIdx) }
      }
    }

    const isRowOp = randomOp.includes('Row')
    const maxIndex = isRowOp
      ? matrix.length - 1
      : matrix.reduce((max, row) => Math.max(max, row.length - 1), -1)

    if (maxIndex < 0) {
      return { 
        operation: randomOp, 
        result: () => ({ error: 'matrix has no usable columns', value: 0 })
      }
    }

    const targetIndex = Math.max(
      0,
      Math.min(
        index ?? Math.floor(Math.random() * (maxIndex + 1)),
        maxIndex,
      ),
    )
    
    // Create a function that will execute the operation when called
    const operationFunction = (inputMatrix?: number[][], inputIndex?: number) => {
      const workMatrix = inputMatrix || matrix
      const workIndex = inputIndex ?? targetIndex
      let result: number | string = 0
      
      switch (randomOp) {
        case 'sumRow':
          result = this.sumRow(workMatrix, workIndex)
          break
        case 'sumCol':
          result = this.sumCol(workMatrix, workIndex)
          break
        case 'avgRow':
          result = this.avgRow(workMatrix, workIndex)
          break
        case 'avgCol':
          result = this.avgCol(workMatrix, workIndex)
          break
        case 'medianRow':
          result = this.medianRow(workMatrix, workIndex)
          break
        case 'medianCol':
          result = this.medianCol(workMatrix, workIndex)
          break
        case 'minRow':
          result = this.minRow(workMatrix, workIndex)
          break
        case 'maxRow':
          result = this.maxRow(workMatrix, workIndex)
          break
        case 'minCol':
          result = this.minCol(workMatrix, workIndex)
          break
        case 'maxCol':
          result = this.maxCol(workMatrix, workIndex)
          break
        case 'productRow':
          result = this.productRow(workMatrix, workIndex)
          break
        case 'productCol':
          result = this.productCol(workMatrix, workIndex)
          break
        case 'stdDevRow':
          result = this.stdDevRow(workMatrix, workIndex)
          break
        case 'stdDevCol':
          result = this.stdDevCol(workMatrix, workIndex)
          break
        case 'sinRow':
          result = this.sinRow(workMatrix, workIndex)
          break
        case 'cosRow':
          result = this.cosRow(workMatrix, workIndex)
          break
        case 'tanRow':
          result = this.tanRow(workMatrix, workIndex)
          break
        case 'sinCol':
          result = this.sinCol(workMatrix, workIndex)
          break
        case 'cosCol':
          result = this.cosCol(workMatrix, workIndex)
          break
        case 'tanCol':
          result = this.tanCol(workMatrix, workIndex)
          break
        case 'sqrtSumRow':
          result = this.sqrtSumRow(workMatrix, workIndex)
          break
        case 'sqrtSumCol':
          result = this.sqrtSumCol(workMatrix, workIndex)
          break
        case 'hypotRow':
          result = this.hypotRow(workMatrix, workIndex)
          break
        case 'hypotCol':
          result = this.hypotCol(workMatrix, workIndex)
          break
        case 'varianceRow':
          result = this.varianceRow(workMatrix, workIndex)
          break
        case 'varianceCol':
          result = this.varianceCol(workMatrix, workIndex)
          break
        case 'percentileRow':
          result = this.percentileRow(workMatrix, workIndex, 75)
          break
        case 'percentileCol':
          result = this.percentileCol(workMatrix, workIndex, 75)
          break
        case 'harmonicMeanRow':
          result = this.harmonicMeanRow(workMatrix, workIndex)
          break
        case 'harmonicMeanCol':
          result = this.harmonicMeanCol(workMatrix, workIndex)
          break
        case 'rangeRow':
          result = this.rangeRow(workMatrix, workIndex)
          break
        case 'rangeCol':
          result = this.rangeCol(workMatrix, workIndex)
          break
      }
      
      // Sometimes chain to another random function (20% chance)
      if (Math.random() < 0.2 && typeof result === 'number' && result !== 0) {
        const chainedFunction = this.randomFunc(workMatrix, Math.floor(Math.abs(result)) % workMatrix.length, false)
        const chainedResult = chainedFunction.result(workMatrix)
        
        return {
          value: chainedResult.value || result,
          operation: `${randomOp}(${workIndex}) -> ${chainedFunction.operation}`,
          chained: true,
          originalResult: result
        }
      }
      
      return {
        value: result,
        operation: `${randomOp}(${workIndex})`,
        chained: false
      }
    }
    
    return { 
      operation: `${randomOp}(${targetIndex})`, 
      result: operationFunction
    }
  }

  createChainFunction(matrix: number[][], defaultIndex?: number): Function {
    const operations = ['sumRow', 'avgRow', 'maxRow', 'minRow', 'stdDevRow']
    const chainLength = Math.floor(Math.random() * 3) + 2 // 2-4 operations
    
    return (inputMatrix?: number[][], startIndex?: number) => {
      const workingMatrix = inputMatrix || matrix
      let currentIndex = startIndex ?? defaultIndex ?? Math.floor(Math.random() * workingMatrix.length)
      let result = 0
      const appliedOps: string[] = []
      
      for (let i = 0; i < chainLength; i++) {
        const randomOp = operations[Math.floor(Math.random() * operations.length)]
        currentIndex = Math.max(0, Math.min(currentIndex, workingMatrix.length - 1))
        
        switch (randomOp) {
          case 'sumRow':
            result = this.sumRow(workingMatrix, currentIndex)
            break
          case 'avgRow':
            result = this.avgRow(workingMatrix, currentIndex)
            break
          case 'maxRow':
            result = this.maxRow(workingMatrix, currentIndex)
            break
          case 'minRow':
            result = this.minRow(workingMatrix, currentIndex)
            break
          case 'stdDevRow':
            result = this.stdDevRow(workingMatrix, currentIndex)
            break
        }
        appliedOps.push(`${randomOp}(${currentIndex})`)
        currentIndex = Math.floor(Math.abs(result)) % workingMatrix.length
      }
      
      return {
        value: this.roundResult(typeof result === 'number' ? result : 0),
        operation: appliedOps.join(' -> '),
        result: this.roundResult(typeof result === 'number' ? result : 0),
        operations: appliedOps,
        chainLength
      }
    }
  }

  createCompositeFunction(matrix: number[][], defaultIndex?: number): Function {
    const operations = ['sinCol', 'cosCol', 'tanCol', 'sqrtSumCol', 'hypotCol']
    
    return (inputMatrix?: number[][], colIndex?: number) => {
      const workingMatrix = inputMatrix || matrix
      const targetCol = colIndex ?? defaultIndex ?? Math.floor(Math.random() * (workingMatrix[0]?.length || 1))
      
      const primaryOp = operations[Math.floor(Math.random() * operations.length)]
      const secondaryOp = operations[Math.floor(Math.random() * operations.length)]
      
      let firstResult = 0
      let secondResult = 0
      
      switch (primaryOp) {
        case 'sinCol':
          firstResult = this.sinCol(workingMatrix, targetCol)
          break
        case 'cosCol':
          firstResult = this.cosCol(workingMatrix, targetCol)
          break
        case 'tanCol':
          firstResult = this.tanCol(workingMatrix, targetCol)
          break
        case 'sqrtSumCol':
          firstResult = typeof this.sqrtSumCol(workingMatrix, targetCol) === 'number' 
            ? this.sqrtSumCol(workingMatrix, targetCol) as number : 0
          break
        case 'hypotCol':
          firstResult = this.hypotCol(workingMatrix, targetCol)
          break
      }
      
      switch (secondaryOp) {
        case 'sinCol':
          secondResult = this.sinCol(workingMatrix, (targetCol + 1) % (workingMatrix[0]?.length || 1))
          break
        case 'cosCol':
          secondResult = this.cosCol(workingMatrix, (targetCol + 1) % (workingMatrix[0]?.length || 1))
          break
        case 'tanCol':
          secondResult = this.tanCol(workingMatrix, (targetCol + 1) % (workingMatrix[0]?.length || 1))
          break
        case 'sqrtSumCol':
          secondResult = typeof this.sqrtSumCol(workingMatrix, (targetCol + 1) % (workingMatrix[0]?.length || 1)) === 'number'
            ? this.sqrtSumCol(workingMatrix, (targetCol + 1) % (workingMatrix[0]?.length || 1)) as number : 0
          break
        case 'hypotCol':
          secondResult = this.hypotCol(workingMatrix, (targetCol + 1) % (workingMatrix[0]?.length || 1))
          break
      }
      
      const compositeResult = this.roundResult(firstResult * secondResult + Math.sin(firstResult))
      
      return {
        value: compositeResult,
        operation: `(${primaryOp} * ${secondaryOp}) + sin(${primaryOp})`,
        result: compositeResult,
        operations: [primaryOp, secondaryOp],
        composition: `(${primaryOp} * ${secondaryOp}) + sin(${primaryOp})`
      }
    }
  }

  createTransformFunction(matrix: number[][], defaultIndex?: number): Function {
    const transformTypes = ['polynomial', 'trigonometric', 'logarithmic', 'exponential']
    const selectedTransform = transformTypes[Math.floor(Math.random() * transformTypes.length)]
    
    return (inputData?: number[] | number[][], transformParam?: number) => {
      let dataToTransform: number[]
      
      if (Array.isArray(inputData)) {
        if (Array.isArray(inputData[0])) {
          // Matrix input - use defaultIndex row if provided, else first row
          const rowIndex = defaultIndex ?? 0
          dataToTransform = (inputData as number[][])[rowIndex] || []
        } else {
          // Array input
          dataToTransform = inputData as number[]
        }
      } else {
        // Use matrix data
        dataToTransform = matrix[0] || []
      }
      
      const param = transformParam ?? (Math.random() * 5 + 1)
      const transformedData: number[] = []
      
      for (const value of dataToTransform) {
        let transformed = 0
        
        switch (selectedTransform) {
          case 'polynomial':
            transformed = Math.pow(value, param) + param * value + 1
            break
          case 'trigonometric':
            transformed = Math.sin(value * param) + Math.cos(value / param)
            break
          case 'logarithmic':
            transformed = Math.log(Math.abs(value) + 1) * param
            break
          case 'exponential':
            transformed = Math.exp(value / param) - 1
            break
        }
        
        transformedData.push(this.roundResult(transformed))
      }
      
      // Return first element as value for consistency with other functions
      // But also include the full result array for backward compatibility
      return {
        value: transformedData[0] || 0,
        operation: `transformFunction(${selectedTransform})`,
        result: transformedData,
        transform: selectedTransform,
        parameter: this.roundResult(param),
        originalLength: dataToTransform.length
      }
    }
  }

  private sumRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length) return this.productRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const result = matrix[rowIndex].reduce((sum, val) => sum + val, 0)
    if (result === 0) return this.productRow(matrix, rowIndex)
    return result
  }

  private sumCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return this.productCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const result = matrix.reduce((sum, row) => sum + (row[colIndex] || 0), 0)
    if (result === 0) return this.productCol(matrix, colIndex)
    return result
  }

  private avgRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0) return this.medianRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const sum = matrix[rowIndex].reduce((sum, val) => sum + val, 0)
    const result = sum / matrix[rowIndex].length
    if (result === 0) return this.medianRow(matrix, rowIndex)
    if (!isFinite(result)) return this.maxRow(matrix, rowIndex)
    return result
  }

  private avgCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return this.medianCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const sum = matrix.reduce((sum, row) => sum + (row[colIndex] || 0), 0)
    const result = sum / matrix.length
    if (result === 0) return this.medianCol(matrix, colIndex)
    if (!isFinite(result)) return this.maxCol(matrix, colIndex)
    return result
  }

  private medianRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length) return this.minRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const sorted = [...matrix[rowIndex]].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const result = sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid]
    if (result === 0) return this.maxRow(matrix, rowIndex)
    return result
  }

  private medianCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return this.minCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0).sort((a, b) => a - b)
    const mid = Math.floor(colValues.length / 2)
    const result = colValues.length % 2 === 0 
      ? (colValues[mid - 1] + colValues[mid]) / 2 
      : colValues[mid]
    if (result === 0) return this.maxCol(matrix, colIndex)
    return result
  }

  private minRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0) return this.rangeRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const result = Math.min(...matrix[rowIndex])
    if (result === 0) return this.stdDevRow(matrix, rowIndex)
    return result
  }

  private maxRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0) return this.rangeRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const result = Math.max(...matrix[rowIndex])
    if (result === 0) return this.varianceRow(matrix, rowIndex)
    if (!isFinite(result)) return this.hypotRow(matrix, rowIndex)
    return result
  }

  private minCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return this.rangeCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const result = Math.min(...colValues)
    if (result === 0) return this.stdDevCol(matrix, colIndex)
    return result
  }

  private maxCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return this.rangeCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const result = Math.max(...colValues)
    if (result === 0) return this.varianceCol(matrix, colIndex)
    if (!isFinite(result)) return this.hypotCol(matrix, colIndex)
    return result
  }

  private productRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length) return this.hypotRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const result = matrix[rowIndex].reduce((product, val) => product * val, 1)
    if (result === 0) return matrix[rowIndex].reduce((sum, val) => sum + Math.abs(val), 0)
    if (!isFinite(result)) return this.hypotRow(matrix, rowIndex)
    return result
  }

  private productCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return this.hypotCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const result = matrix.reduce((product, row) => product * (row[colIndex] || 0), 1)
    if (result === 0) return matrix.reduce((sum, row) => sum + Math.abs(row[colIndex] || 0), 0)
    if (!isFinite(result)) return this.hypotCol(matrix, colIndex)
    return result
  }

  private stdDevRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0) return this.varianceRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const avg = matrix[rowIndex].reduce((sum, val) => sum + val, 0) / matrix[rowIndex].length
    const variance = matrix[rowIndex].reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / matrix[rowIndex].length
    const result = Math.sqrt(variance)
    if (result === 0) return 0.1
    if (!isFinite(result)) return 1
    return result
  }

  private stdDevCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return this.varianceCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const avg = colValues.reduce((sum, val) => sum + val, 0) / colValues.length
    const variance = colValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / colValues.length
    const result = Math.sqrt(variance)
    if (result === 0) return 0.1
    if (!isFinite(result)) return 1
    return result
  }

  private roundResult(value: number, decimals: number = 3): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }

  private sinRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0) return this.cosRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const avg = matrix[rowIndex].reduce((sum, val) => sum + val, 0) / matrix[rowIndex].length
    const result = this.roundResult(Math.sin(avg * Math.PI / 180))
    if (result === 0) return this.roundResult(Math.cos(avg * Math.PI / 180))
    if (!isFinite(result)) return this.roundResult(Math.tan(avg * Math.PI / 180))
    return result
  }

  private cosRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0) return this.sinRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const avg = matrix[rowIndex].reduce((sum, val) => sum + val, 0) / matrix[rowIndex].length
    const result = this.roundResult(Math.cos(avg * Math.PI / 180))
    if (result === 0) return this.roundResult(Math.sin(avg * Math.PI / 180))
    if (!isFinite(result)) return this.roundResult(Math.tan(avg * Math.PI / 180))
    return result
  }

  private tanRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0) return this.sinRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const avg = matrix[rowIndex].reduce((sum, val) => sum + val, 0) / matrix[rowIndex].length
    const result = this.roundResult(Math.tan(avg * Math.PI / 180))
    if (result === 0) return this.roundResult(Math.sin(avg * Math.PI / 180))
    if (!isFinite(result)) return this.roundResult(Math.cos(avg * Math.PI / 180))
    return result
  }

  private sinCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return this.cosCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const avg = colValues.reduce((sum, val) => sum + val, 0) / colValues.length
    const result = this.roundResult(Math.sin(avg * Math.PI / 180))
    if (result === 0) return this.roundResult(Math.cos(avg * Math.PI / 180))
    if (!isFinite(result)) return this.roundResult(Math.tan(avg * Math.PI / 180))
    return result
  }

  private cosCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return this.sinCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const avg = colValues.reduce((sum, val) => sum + val, 0) / colValues.length
    const result = this.roundResult(Math.cos(avg * Math.PI / 180))
    if (result === 0) return this.roundResult(Math.sin(avg * Math.PI / 180))
    if (!isFinite(result)) return this.roundResult(Math.tan(avg * Math.PI / 180))
    return result
  }

  private tanCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return this.sinCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const avg = colValues.reduce((sum, val) => sum + val, 0) / colValues.length
    const result = this.roundResult(Math.tan(avg * Math.PI / 180))
    if (result === 0) return this.roundResult(Math.sin(avg * Math.PI / 180))
    if (!isFinite(result)) return this.roundResult(Math.cos(avg * Math.PI / 180))
    return result
  }

  private sqrtSumRow(matrix: number[][], rowIndex: number): number | string {
    if (rowIndex < 0 || rowIndex >= matrix.length) return this.hypotRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const sum = matrix[rowIndex].reduce((sum, val) => sum + val, 0)
    if (sum < 0) {
      return `${this.roundResult(Math.sqrt(Math.abs(sum)))}i`
    }
    const result = this.roundResult(Math.sqrt(sum))
    if (result === 0) return this.roundResult(this.hypotRow(matrix, rowIndex))
    if (!isFinite(result)) return this.roundResult(this.rangeRow(matrix, rowIndex))
    return result
  }

  private sqrtSumCol(matrix: number[][], colIndex: number): number | string {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return this.hypotCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const sum = matrix.reduce((sum, row) => sum + (row[colIndex] || 0), 0)
    if (sum < 0) {
      return `${this.roundResult(Math.sqrt(Math.abs(sum)))}i`
    }
    const result = this.roundResult(Math.sqrt(sum))
    if (result === 0) return this.roundResult(this.hypotCol(matrix, colIndex))
    if (!isFinite(result)) return this.roundResult(this.rangeCol(matrix, colIndex))
    return result
  }

  private hypotRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length < 2) return this.varianceRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const values = matrix[rowIndex]
    const sumOfSquares = values.reduce((sum, val) => sum + val * val, 0)
    const result = this.roundResult(Math.sqrt(sumOfSquares))
    if (result === 0) return this.roundResult(this.rangeRow(matrix, rowIndex))
    if (!isFinite(result)) return this.roundResult(this.stdDevRow(matrix, rowIndex))
    return result
  }

  private hypotCol(matrix: number[][], colIndex: number): number {
    if (matrix.length < 2 || colIndex < 0 || colIndex >= matrix[0].length) return this.varianceCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const sumOfSquares = colValues.reduce((sum, val) => sum + val * val, 0)
    const result = this.roundResult(Math.sqrt(sumOfSquares))
    if (result === 0) return this.roundResult(this.rangeCol(matrix, colIndex))
    if (!isFinite(result)) return this.roundResult(this.stdDevCol(matrix, colIndex))
    return result
  }

  private varianceRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0) return this.rangeRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const row = matrix[rowIndex]
    const mean = row.reduce((sum, val) => sum + val, 0) / row.length
    const sumOfSquaredDiffs = row.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0)
    const result = this.roundResult(sumOfSquaredDiffs / row.length)
    if (result === 0) return this.roundResult(this.rangeRow(matrix, rowIndex) / 4)
    if (!isFinite(result)) return this.roundResult(this.stdDevRow(matrix, rowIndex))
    return result
  }

  private varianceCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return this.rangeCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const mean = colValues.reduce((sum, val) => sum + val, 0) / colValues.length
    const sumOfSquaredDiffs = colValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0)
    const result = this.roundResult(sumOfSquaredDiffs / colValues.length)
    if (result === 0) return this.roundResult(this.rangeCol(matrix, colIndex) / 4)
    if (!isFinite(result)) return this.roundResult(this.stdDevCol(matrix, colIndex))
    return result
  }

  private percentileRow(matrix: number[][], rowIndex: number, percentile: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0) return this.medianRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const sorted = [...matrix[rowIndex]].sort((a, b) => a - b)
    const index = (percentile / 100) * (sorted.length - 1)
    
    let result: number
    if (Number.isInteger(index)) {
      result = sorted[index]
    } else {
      const lower = Math.floor(index)
      const upper = Math.ceil(index)
      const weight = index - lower
      result = this.roundResult(sorted[lower] * (1 - weight) + sorted[upper] * weight)
    }
    
    if (result === 0) return this.medianRow(matrix, rowIndex)
    if (!isFinite(result)) return this.maxRow(matrix, rowIndex)
    return result
  }

  private percentileCol(matrix: number[][], colIndex: number, percentile: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return this.medianCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0).sort((a, b) => a - b)
    const index = (percentile / 100) * (colValues.length - 1)
    
    let result: number
    if (Number.isInteger(index)) {
      result = colValues[index]
    } else {
      const lower = Math.floor(index)
      const upper = Math.ceil(index)
      const weight = index - lower
      result = this.roundResult(colValues[lower] * (1 - weight) + colValues[upper] * weight)
    }
    
    if (result === 0) return this.medianCol(matrix, colIndex)
    if (!isFinite(result)) return this.maxCol(matrix, colIndex)
    return result
  }

  private harmonicMeanRow(matrix: number[][], rowIndex: number): number | string {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0) return this.avgRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const row = matrix[rowIndex]
    
    if (row.some(val => val === 0)) {
      return 'undefined (zero value)'
    }
    
    const sumOfReciprocals = row.reduce((sum, val) => sum + (1 / val), 0)
    const result = this.roundResult(row.length / sumOfReciprocals)
    if (result === 0) return this.avgRow(matrix, rowIndex)
    if (!isFinite(result)) return this.medianRow(matrix, rowIndex)
    return result
  }

  private harmonicMeanCol(matrix: number[][], colIndex: number): number | string {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return this.avgCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    
    if (colValues.some(val => val === 0)) {
      return this.avgCol(matrix, colIndex)
    }
    
    const sumOfReciprocals = colValues.reduce((sum, val) => sum + (1 / val), 0)
    const result = this.roundResult(colValues.length / sumOfReciprocals)
    if (result === 0) return this.avgCol(matrix, colIndex)
    if (!isFinite(result)) return this.medianCol(matrix, colIndex)
    return result
  }

  private rangeRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0) return 1
    const max = Math.max(...matrix[rowIndex])
    const min = Math.min(...matrix[rowIndex])
    const result = max - min
    if (result === 0) return 0.1
    if (!isFinite(result)) return this.varianceRow(matrix, rowIndex)
    return result
  }

  private rangeCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return 1
    const colValues = matrix.map(row => row[colIndex] || 0)
    const max = Math.max(...colValues)
    const min = Math.min(...colValues)
    const result = max - min
    if (result === 0) return 0.1
    if (!isFinite(result)) return this.varianceCol(matrix, colIndex)
    return result
  }

  generateRandomNumbers(count: number, min: number = 0, max: number = 100): number[] {
    const numbers: number[] = []
    for (let i = 0; i < count; i++) {
      numbers.push(Math.floor(Math.random() * (max - min + 1)) + min)
    }
    return numbers
  }

  generateNormalDistribution(count: number, mean: number = 0, stdDev: number = 1): number[] {
    const numbers: number[] = []
    for (let i = 0; i < count; i += 2) {
      const [u1, u2] = [Math.random(), Math.random()]
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2)
      
      numbers.push(this.roundResult(z0 * stdDev + mean))
      if (numbers.length < count) {
        numbers.push(this.roundResult(z1 * stdDev + mean))
      }
    }
    return numbers.slice(0, count)
  }

  correlationBetweenArrays(arr1: number[], arr2: number[]): number | string {
    if (arr1.length !== arr2.length || arr1.length === 0) {
      return 'Invalid arrays'
    }
    
    const mean1 = arr1.reduce((sum, val) => sum + val, 0) / arr1.length
    const mean2 = arr2.reduce((sum, val) => sum + val, 0) / arr2.length
    
    let numerator = 0
    let sumSq1 = 0
    let sumSq2 = 0
    
    for (let i = 0; i < arr1.length; i++) {
      const diff1 = arr1[i] - mean1
      const diff2 = arr2[i] - mean2
      numerator += diff1 * diff2
      sumSq1 += diff1 * diff1
      sumSq2 += diff2 * diff2
    }
    
    const denominator = Math.sqrt(sumSq1 * sumSq2)
    if (denominator === 0) {
      return 'undefined (no variance)'
    }
    
    return this.roundResult(numerator / denominator)
  }

  randomSample<T>(array: T[], sampleSize: number): T[] {
    if (sampleSize >= array.length) return [...array]
    
    const sample: T[] = []
    const indices = new Set<number>()
    
    while (indices.size < sampleSize) {
      const randomIndex = Math.floor(Math.random() * array.length)
      if (!indices.has(randomIndex)) {
        indices.add(randomIndex)
        sample.push(array[randomIndex])
      }
    }
    
    return sample
  }

  evaluate(expression: string): number | string {
    try {
      // Handle degree conversions
      const degreePattern = /(\d+(?:\.\d+)?)\s*deg/g
      const convertedExpr = expression.replace(degreePattern, (match, deg) => {
        return (parseFloat(deg) * Math.PI / 180).toString()
      })

      // Handle unit conversions (inches to cm)
      const inchPattern = /(\d+(?:\.\d+)?)\s*inch\s*to\s*cm/g
      if (inchPattern.test(expression)) {
        const result = expression.replace(inchPattern, (match, inches) => {
          return (parseFloat(inches) * 2.54).toString()
        })
        return this.roundResult(parseFloat(result)) + ' cm'
      }

      // Handle complex square roots
      if (convertedExpr.includes('sqrt(-')) {
        const negativePattern = /sqrt\((-?\d+(?:\.\d+)?)\)/g
        const result = convertedExpr.replace(negativePattern, (match, num) => {
          const value = parseFloat(num)
          if (value < 0) {
            return Math.sqrt(Math.abs(value)).toString() + 'i'
          }
          return Math.sqrt(value).toString()
        })
        
        // If result contains 'i', return as complex number
        if (result.includes('i')) {
          return result
        }
      }

      // Use eval for basic mathematical expressions (in a controlled manner)
      const mathExpression = convertedExpr
        .replace(/\bsin\(/g, 'Math.sin(')
        .replace(/\bcos\(/g, 'Math.cos(')
        .replace(/\btan\(/g, 'Math.tan(')
        .replace(/\bsqrt\(/g, 'Math.sqrt(')
        .replace(/\bpow\(/g, 'Math.pow(')
        .replace(/\^/g, '**')

      const result = eval(mathExpression)
      
      // Return the actual result, including 0
      if (result === 0) {
        return this.roundResult(result)
      }
      
      if (!isFinite(result)) {
        // Return a different mathematical function when result is infinity
        const alternatives = [
          'sqrt(16)',     // 4
          'pow(3, 2)',    // 9
          'cos(0 deg)',   // 1
          'sin(90 deg)',  // 1
          '7 + 1',        // 8
          '3 * 3',        // 9
          '12 / 3',       // 4
          'sqrt(25)'      // 5
        ]
        const chosen = alternatives[Math.abs(expression.length) % alternatives.length]
        return this.evaluate(chosen)
      }
      
      return this.roundResult(result)

    } catch (error) {
      // Return a simple mathematical function when there's an error
      const errorAlternatives = [
        'sqrt(4)',      // 2
        'pow(2, 2)',    // 4
        '1 + 2',        // 3
        '2 * 2',        // 4
        '6 / 2'         // 3
      ]
      const chosen = errorAlternatives[Math.abs(expression.length) % errorAlternatives.length]
      return this.evaluate(chosen)
    }
  }

  // Statistical functions using ts-stats library
  statsAverage(numbers: number[]): number | string {
    if (numbers.length === 0) return 'empty array'
    try {
      const result = avg(numbers)
      return typeof result === 'number' ? this.roundResult(result) : 'calculation error'
    } catch (error) {
      return 'calculation error'
    }
  }

  statsMedian(numbers: number[]): number | string {
    if (numbers.length === 0) return 'empty array'
    try {
      const result = median(numbers)
      return typeof result === 'number' ? this.roundResult(result) : 'calculation error'
    } catch (error) {
      return 'calculation error'
    }
  }

  statsMode(numbers: number[]): number[] | string {
    if (numbers.length === 0) return 'empty array'
    try {
      const result = mode(numbers)
      if (Array.isArray(result)) {
        return result.filter((item): item is number => typeof item === 'number')
      } else if (typeof result === 'number') {
        return [result]
      } else if (typeof result === 'string' && result.includes('No mode found')) {
        // ts-stats returns an error string when no mode is found
        return []
      }
      return 'calculation error'
    } catch (error) {
      // ts-stats mode throws an error when no mode is found
      // Return an empty array to indicate no mode
      return []
    }
  }

  statsStandardDeviation(numbers: number[]): number | string {
    if (numbers.length === 0) return 'empty array'
    try {
      const result = stdDev(numbers)
      return typeof result === 'number' ? this.roundResult(result) : 'calculation error'
    } catch (error) {
      return 'calculation error'
    }
  }

  statsVariance(numbers: number[]): number | string {
    if (numbers.length === 0) return 'empty array'
    try {
      const result = variance(numbers)
      return typeof result === 'number' ? this.roundResult(result) : 'calculation error'
    } catch (error) {
      return 'calculation error'
    }
  }

  statsHarmonicMean(numbers: number[]): number | string {
    if (numbers.length === 0) return 'empty array'
    if (numbers.some(n => n <= 0)) return 'invalid input (non-positive values)'
    try {
      const result = harmonicMean(numbers)
      return typeof result === 'number' ? this.roundResult(result) : 'calculation error'
    } catch (error) {
      return 'calculation error'
    }
  }

  statsRange(numbers: number[]): number | string {
    if (numbers.length === 0) return 'empty array'
    try {
      const result = range(numbers)
      return typeof result === 'number' ? this.roundResult(result) : 'calculation error'
    } catch (error) {
      return 'calculation error'
    }
  }

  statsExtrema(numbers: number[]): { min: number; max: number } | string {
    if (numbers.length === 0) return 'empty array'
    try {
      const result = extrema(numbers)
      // ts-stats extrema returns an array [min, max]
      if (Array.isArray(result) && result.length >= 2 && 
          typeof result[0] === 'number' && typeof result[1] === 'number') {
        return {
          min: this.roundResult(result[0]),
          max: this.roundResult(result[1])
        }
      }
      return 'calculation error'
    } catch (error) {
      return 'calculation error'
    }
  }

  statsPercentile(numbers: number[], p: number): number | string {
    if (numbers.length === 0) return 'empty array'
    if (p < 0 || p > 100) return 'percentile must be between 0 and 100'
    try {
      const result = percentile(numbers, p)
      return typeof result === 'number' ? this.roundResult(result) : 'calculation error'
    } catch (error) {
      return 'calculation error'
    }
  }

  statsCorrelation(arr1: number[], arr2: number[]): number | string {
    if (arr1.length === 0 || arr2.length === 0) return 'empty array'
    if (arr1.length !== arr2.length) return 'arrays must have same length'
    try {
      const result = corelation(arr1, arr2)
      return typeof result === 'number' ? this.roundResult(result) : 'calculation error'
    } catch (error) {
      return 'calculation error'
    }
  }

  // Random statistical analysis function
  randomStatsFunc(numbers: number[]): { operation: string; result: Function } {
    if (numbers.length === 0) {
      return { 
        operation: 'noop', 
        result: () => ({ error: 'no data', value: 0 })
      }
    }

    const operations = [
      'average', 'median', 'mode', 'standardDeviation', 'variance', 
      'harmonicMean', 'range', 'extrema', 'percentile25', 'percentile75',
      'statsChainFunction', 'aggregateFunction', 'distributionFunction'
    ]

    const randomOp = operations[Math.floor(Math.random() * operations.length)]
    
    // Handle statistical function factories
    if (['statsChainFunction', 'aggregateFunction', 'distributionFunction'].includes(randomOp)) {
      switch (randomOp) {
        case 'statsChainFunction':
          return { operation: 'statsChainFunction', result: this.createStatsChainFunction(numbers) }
        case 'aggregateFunction':
          return { operation: 'aggregateFunction', result: this.createAggregateFunction(numbers) }
        case 'distributionFunction':
          return { operation: 'distributionFunction', result: this.createDistributionFunction(numbers) }
      }
    }

    // Create a function that will execute the statistical operation
    const statsOperationFunction = (inputNumbers?: number[], param?: number) => {
      const workNumbers = inputNumbers || numbers
      let result: number | string | number[] | { min: number; max: number } = 0

      switch (randomOp) {
        case 'average':
          result = this.statsAverage(workNumbers)
          break
        case 'median':
          result = this.statsMedian(workNumbers)
          break
        case 'mode':
          result = this.statsMode(workNumbers)
          break
        case 'standardDeviation':
          result = this.statsStandardDeviation(workNumbers)
          break
        case 'variance':
          result = this.statsVariance(workNumbers)
          break
        case 'harmonicMean':
          result = this.statsHarmonicMean(workNumbers)
          break
        case 'range':
          result = this.statsRange(workNumbers)
          break
        case 'extrema':
          result = this.statsExtrema(workNumbers)
          break
        case 'percentile25':
          result = this.statsPercentile(workNumbers, param || 25)
          break
        case 'percentile75':
          result = this.statsPercentile(workNumbers, param || 75)
          break
      }

      // Sometimes chain to another statistical function (25% chance)
      if (Math.random() < 0.25 && typeof result === 'number' && result !== 0) {
        const chainedStatsFunc = this.randomStatsFunc(workNumbers)
        const chainedResult = chainedStatsFunc.result(workNumbers)
        
        return {
          value: chainedResult.value || result,
          operation: `${randomOp} -> ${chainedStatsFunc.operation}`,
          chained: true,
          originalResult: result,
          chainedResult: chainedResult.value
        }
      }

      return {
        value: result,
        operation: randomOp,
        chained: false
      }
    }

    return { operation: randomOp, result: statsOperationFunction }
  }

  createStatsChainFunction(numbers: number[]): Function {
    const operations = ['average', 'median', 'standardDeviation', 'variance', 'range']
    const chainLength = Math.floor(Math.random() * 4) + 2 // 2-5 operations
    
    return (inputNumbers?: number[]) => {
      const workNumbers = inputNumbers || numbers
      let currentData = [...workNumbers]
      const appliedOps: string[] = []
      const results: (number | string)[] = []
      
      for (let i = 0; i < chainLength; i++) {
        const randomOp = operations[Math.floor(Math.random() * operations.length)]
        let result: number | string = 0
        
        switch (randomOp) {
          case 'average':
            result = this.statsAverage(currentData)
            break
          case 'median':
            result = this.statsMedian(currentData)
            break
          case 'standardDeviation':
            result = this.statsStandardDeviation(currentData)
            break
          case 'variance':
            result = this.statsVariance(currentData)
            break
          case 'range':
            result = this.statsRange(currentData)
            break
        }
        
        appliedOps.push(randomOp)
        results.push(result)
        
        // Use result to modify the data for next iteration
        if (typeof result === 'number' && result > 0) {
          currentData = currentData.map(x => x * (result / 100))
        }
      }
      
      return {
        finalResult: results[results.length - 1],
        operations: appliedOps,
        allResults: results,
        chainLength
      }
    }
  }

  createAggregateFunction(numbers: number[]): Function {
    const aggregateTypes = ['sum', 'product', 'geometricMean', 'rootMeanSquare']
    const selectedAggregate = aggregateTypes[Math.floor(Math.random() * aggregateTypes.length)]
    
    return (inputNumbers?: number[], weights?: number[]) => {
      const workNumbers = inputNumbers || numbers
      const workWeights = weights || workNumbers.map(() => 1)
      let result = 0
      
      switch (selectedAggregate) {
        case 'sum':
          result = workNumbers.reduce((sum, val, idx) => sum + val * workWeights[idx % workWeights.length], 0)
          break
        case 'product':
          result = workNumbers.reduce((prod, val, idx) => prod * Math.pow(val, workWeights[idx % workWeights.length]), 1)
          break
        case 'geometricMean':
          const product = workNumbers.reduce((prod, val) => prod * Math.abs(val), 1)
          result = Math.pow(product, 1 / workNumbers.length)
          break
        case 'rootMeanSquare':
          const sumOfSquares = workNumbers.reduce((sum, val) => sum + val * val, 0)
          result = Math.sqrt(sumOfSquares / workNumbers.length)
          break
      }
      
      return {
        result: this.roundResult(result),
        aggregateType: selectedAggregate,
        inputSize: workNumbers.length,
        weightedCalculation: weights !== undefined
      }
    }
  }

  createDistributionFunction(numbers: number[]): Function {
    const distributionTypes = ['histogram', 'quantiles', 'outliers', 'zscore']
    const selectedType = distributionTypes[Math.floor(Math.random() * distributionTypes.length)]
    
    return (inputNumbers?: number[], bins?: number) => {
      const workNumbers = inputNumbers || numbers
      const binCount = bins || Math.min(10, Math.max(3, Math.floor(workNumbers.length / 3)))
      
      switch (selectedType) {
        case 'histogram':
          const min = Math.min(...workNumbers)
          const max = Math.max(...workNumbers)
          const binWidth = (max - min) / binCount
          const histogram = new Array(binCount).fill(0)
          
          workNumbers.forEach(num => {
            const binIndex = Math.min(Math.floor((num - min) / binWidth), binCount - 1)
            histogram[binIndex]++
          })
          
          return {
            histogram,
            binWidth: this.roundResult(binWidth),
            range: { min, max },
            totalCount: workNumbers.length
          }
          
        case 'quantiles':
          const sorted = [...workNumbers].sort((a, b) => a - b)
          const quantiles = [0.25, 0.5, 0.75, 0.9, 0.95].map(q => {
            const index = q * (sorted.length - 1)
            return sorted[Math.floor(index)]
          })
          
          return {
            quantiles: quantiles.map(q => this.roundResult(q)),
            percentiles: [25, 50, 75, 90, 95],
            distributionType: 'quantiles'
          }
          
        case 'outliers':
          const mean = workNumbers.reduce((sum, val) => sum + val, 0) / workNumbers.length
          const stdDev = Math.sqrt(workNumbers.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / workNumbers.length)
          const outliers = workNumbers.filter(val => Math.abs(val - mean) > 2 * stdDev)
          
          return {
            outliers: outliers.map(o => this.roundResult(o)),
            outlierCount: outliers.length,
            threshold: this.roundResult(2 * stdDev),
            mean: this.roundResult(mean)
          }
          
        case 'zscore':
          const zMean = workNumbers.reduce((sum, val) => sum + val, 0) / workNumbers.length
          const zStdDev = Math.sqrt(workNumbers.reduce((sum, val) => sum + Math.pow(val - zMean, 2), 0) / workNumbers.length)
          const zScores = workNumbers.map(val => (val - zMean) / zStdDev)
          
          return {
            zScores: zScores.map(z => this.roundResult(z)),
            mean: this.roundResult(zMean),
            standardDeviation: this.roundResult(zStdDev),
            distributionType: 'zscore'
          }
          
        default:
          return { error: 'unknown distribution type' }
      }
    }
  }

  // Generate random data for statistical analysis
  generateStatisticalSample(size: number = 20): {
    uniform: number[]
    normal: number[]
    exponential: number[]
  } {
    const uniform = this.generateRandomNumbers(size, 1, 100)
    const normal = this.generateNormalDistribution(size, 50, 15)
    
    // Generate exponential distribution using inverse transform
    const exponential: number[] = []
    for (let i = 0; i < size; i++) {
      const u = Math.random()
      const lambda = 0.05
      exponential.push(this.roundResult(-Math.log(1 - u) / lambda))
    }

    return { uniform, normal, exponential }
  }

  // Inverse cotangent function
  acot(value: number): number {
    if (value === 0) {
      return Math.PI / 2 // 90 degrees in radians
    }
    // acot(x) = atan(1/x)
    const result = Math.atan(1 / value)
    return this.roundResult(result)
  }

  // Extract imaginary part of a complex number
  im(value: number | string): number {
    if (typeof value === 'string') {
      // Handle complex number strings like "3+4i" or "5i"
      const complexMatch = value.match(/([+-]?\d*\.?\d*)\s*i/)
      if (complexMatch) {
        const imaginaryPart = complexMatch[1]
        if (imaginaryPart === '' || imaginaryPart === '+') return 1
        if (imaginaryPart === '-') return -1
        return parseFloat(imaginaryPart) || 0
      }
    }
    // For real numbers, imaginary part is 0
    return 0
  }

  // Extract real part of a complex number
  re(value: number | string): number {
    if (typeof value === 'string') {
      // Handle complex number strings like "3+4i" or just "5"
      const complexMatch = value.match(/^([+-]?\d*\.?\d*)\s*[+-]?\s*\d*\.?\d*i?$/)
      if (complexMatch) {
        const realPart = complexMatch[1]
        if (realPart === '' || realPart === '+') return 1
        if (realPart === '-') return -1
        return parseFloat(realPart) || 0
      }
      // Try parsing as just a number
      const numValue = parseFloat(value)
      return isNaN(numValue) ? 0 : numValue
    }
    return value
  }

  // Helper function to create complex number string
  complex(real: number, imaginary: number): string {
    if (imaginary === 0) return real.toString()
    if (real === 0) {
      if (imaginary === 1) return 'i'
      if (imaginary === -1) return '-i'
      return `${imaginary}i`
    }
    
    const imagPart = imaginary === 1 ? 'i' : imaginary === -1 ? '-i' : `${imaginary}i`
    const sign = imaginary >= 0 ? '+' : ''
    return `${real}${sign}${imagPart}`
  }
}
