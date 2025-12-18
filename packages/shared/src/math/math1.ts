import { Ripple } from '../utils/ripple.js'
import { Utils } from '../utils/utils.js'
import { LinearAlgebra } from './linearAlgebra.js'
import { MatrixOperations } from './matrixOperations.js'
import { SignalProcessing } from './signalProcessing.js'
import { StatisticalFunctions } from './statisticalFunctions.js'
import { TimeSeries } from './timeSeries.js'

export class Math1 {
  private utils: Utils = new Utils()
  private matrixOps: MatrixOperations = new MatrixOperations()
  private seed?: number
  private rngState?: number

  constructor(seed?: number) {
    this.seed = seed
    this.rngState = seed
  }

  // Seeded random number generator (LCG algorithm)
  private seededRandom(): number {
    if (this.rngState === undefined) {
      return Math.random()
    }
    // Linear congruential generator
    this.rngState = (this.rngState * 1664525 + 1013904223) % 2147483647
    return this.rngState / 2147483647
  }

  // Helper to get random with seed support
  private getRandom(): number {
    return this.seed !== undefined ? this.seededRandom() : Math.random()
  }
  private _stats: StatisticalFunctions = new StatisticalFunctions()
  private _timeSeries: TimeSeries = new TimeSeries()
  private _signal: SignalProcessing = new SignalProcessing()
  private _linearAlgebra: LinearAlgebra = new LinearAlgebra()
  public cuboidId: number = 0

  // Public getters for accessing the private instances
  public get stats() {
    return this._stats
  }
  public get signal() {
    return this._signal
  }
  public get linearAlgebra() {
    return this._linearAlgebra
  }
  public get timeSeries() {
    return this._timeSeries
  }
  public get matrix() {
    return this.matrixOps
  }

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

  randomFunc(
    matrix: number[][],
    index?: number,
    enableChaining: boolean = true,
  ): { operation: string; result: Function } {
    if (!Array.isArray(matrix) || matrix.length === 0 || matrix.every(row => row.length === 0)) {
      return {
        operation: 'noop',
        result: () => ({ error: 'matrix has no data', value: 0 }),
      }
    }

    // Enhanced chaining - now always returns functions
    const operations = [
      'sumRow',
      'sumCol',
      'avgRow',
      'avgCol',
      'medianRow',
      'medianCol',
      'minRow',
      'maxRow',
      'minCol',
      'maxCol',
      'productRow',
      'productCol',
      'stdDevRow',
      'stdDevCol',
      'sinRow',
      'cosRow',
      'tanRow',
      'sinCol',
      'cosCol',
      'tanCol',
      'sqrtSumRow',
      'sqrtSumCol',
      'hypotRow',
      'hypotCol',
      'varianceRow',
      'varianceCol',
      'percentileRow',
      'percentileCol',
      'harmonicMeanRow',
      'harmonicMeanCol',
      'rangeRow',
      'rangeCol',
      'chainFunction',
      'compositeFunction',
      'transformFunction',
      'matrixOperation',
      'vectorOperation',
      'statisticalAnalysis',
      'linearAlgebraOperation',
    ]

    const randomOp = operations[Math.floor(this.getRandom() * operations.length)]

    // Handle matrix-based operations that don't need index
    if (['matrixOperation', 'vectorOperation', 'statisticalAnalysis', 'linearAlgebraOperation'].includes(randomOp)) {
      // Use index 0 as default or clamp the provided index to valid range
      const targetIdx = Math.max(0, Math.min(index ?? 0, matrix.length - 1))
      switch (randomOp) {
        case 'matrixOperation':
          return { operation: `matrixOperation(${targetIdx})`, result: this.createMatrixOperationFunction(matrix) }
        case 'vectorOperation':
          return { operation: `vectorOperation(${targetIdx})`, result: this.createVectorOperationFunction(matrix) }
        case 'statisticalAnalysis':
          return {
            operation: `statisticalAnalysis(${targetIdx})`,
            result: this.createStatisticalAnalysisFunction(matrix),
          }
        case 'linearAlgebraOperation':
          return { operation: `linearAlgebraOperation(${targetIdx})`, result: this.createLinearAlgebraFunction(matrix) }
      }
    }

    // Handle function factories that require targetIdx
    if (['chainFunction', 'compositeFunction', 'transformFunction'].includes(randomOp)) {
      const targetIdx = Math.max(0, Math.min(index ?? Math.floor(this.getRandom() * matrix.length), matrix.length - 1))
      switch (randomOp) {
        case 'chainFunction':
          return { operation: `chainFunction(${targetIdx})`, result: this.createChainFunction(matrix, targetIdx) }
        case 'compositeFunction':
          return {
            operation: `compositeFunction(${targetIdx})`,
            result: this.createCompositeFunction(matrix, targetIdx),
          }
        case 'transformFunction':
          return {
            operation: `transformFunction(${targetIdx})`,
            result: this.createTransformFunction(matrix, targetIdx),
          }
      }
    }

    const isRowOp = randomOp.includes('Row')
    const maxIndex = isRowOp ? matrix.length - 1 : matrix.reduce((max, row) => Math.max(max, row.length - 1), -1)

    if (maxIndex < 0) {
      return {
        operation: randomOp,
        result: () => ({ error: 'matrix has no usable columns', value: 0 }),
      }
    }

    const targetIndex = Math.max(0, Math.min(index ?? Math.floor(this.getRandom() * (maxIndex + 1)), maxIndex))
    
    // Decide chaining at function creation time, not execution time
    const shouldChain = this.getRandom() < 0.2 && enableChaining

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

      // Chain if it was decided at function creation time
      if (shouldChain && typeof result === 'number' && result !== 0) {
        const chainedFunction = this.randomFunc(workMatrix, Math.floor(Math.abs(result)) % workMatrix.length, false)
        const chainedResult = chainedFunction.result(workMatrix)

        return {
          value: chainedResult.value || result,
          operation: `${randomOp}(${workIndex}) -> ${chainedFunction.operation}`,
          chained: true,
          originalResult: result,
        }
      }

      return {
        value: result,
        operation: `${randomOp}(${workIndex})`,
        chained: false,
      }
    }

    return {
      operation: `${randomOp}(${targetIndex})`,
      result: operationFunction,
    }
  }

  createChainFunction(matrix: number[][], defaultIndex?: number): Function {
    const operations = ['sumRow', 'avgRow', 'maxRow', 'minRow', 'stdDevRow']
    const chainLength = Math.floor(this.getRandom() * 3) + 2 // 2-4 operations
    
    // Pre-determine the operations and initial index at function creation time
    const preSelectedOps = Array(chainLength).fill(null).map(() => 
      operations[Math.floor(this.getRandom() * operations.length)]
    )
    const randomInitialIndex = Math.floor(this.getRandom() * matrix.length)

    return (inputMatrix?: number[][], startIndex?: number) => {
      const workingMatrix = inputMatrix || matrix
      let currentIndex = startIndex ?? defaultIndex ?? randomInitialIndex
      let result = 0
      const appliedOps: string[] = []

      for (let i = 0; i < chainLength; i++) {
        const randomOp = preSelectedOps[i]
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
        chainLength,
      }
    }
  }

  createCompositeFunction(matrix: number[][], defaultIndex?: number): Function {
    const operations = ['sinCol', 'cosCol', 'tanCol', 'sqrtSumCol', 'hypotCol']
    
    // Pre-determine random choices at function creation time
    const randomTargetCol = Math.floor(this.getRandom() * (matrix[0]?.length || 1))
    const primaryOp = operations[Math.floor(this.getRandom() * operations.length)]
    const secondaryOp = operations[Math.floor(this.getRandom() * operations.length)]

    return (inputMatrix?: number[][], colIndex?: number) => {
      const workingMatrix = inputMatrix || matrix
      const targetCol = colIndex ?? defaultIndex ?? randomTargetCol

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
          firstResult =
            typeof this.sqrtSumCol(workingMatrix, targetCol) === 'number'
              ? (this.sqrtSumCol(workingMatrix, targetCol) as number)
              : 0
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
          secondResult =
            typeof this.sqrtSumCol(workingMatrix, (targetCol + 1) % (workingMatrix[0]?.length || 1)) === 'number'
              ? (this.sqrtSumCol(workingMatrix, (targetCol + 1) % (workingMatrix[0]?.length || 1)) as number)
              : 0
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
        composition: `(${primaryOp} * ${secondaryOp}) + sin(${primaryOp})`,
      }
    }
  }

  createTransformFunction(matrix: number[][], defaultIndex?: number): Function {
    const transformTypes = ['polynomial', 'trigonometric', 'logarithmic', 'exponential']
    const selectedTransform = transformTypes[Math.floor(this.getRandom() * transformTypes.length)]
    const randomParam = this.getRandom() * 5 + 1

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

      const param = transformParam ?? randomParam
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
        originalLength: dataToTransform.length,
      }
    }
  }

  private sumRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length)
      return this.productRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const result = matrix[rowIndex].reduce((sum, val) => sum + val, 0)
    if (result === 0) return this.productRow(matrix, rowIndex)
    return result
  }

  private sumCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length)
      return this.productCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const result = matrix.reduce((sum, row) => sum + (row[colIndex] || 0), 0)
    if (result === 0) return this.productCol(matrix, colIndex)
    return result
  }

  private avgRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0)
      return this.medianRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const sum = matrix[rowIndex].reduce((sum, val) => sum + val, 0)
    const result = sum / matrix[rowIndex].length
    if (result === 0) return this.medianRow(matrix, rowIndex)
    if (!isFinite(result)) return this.maxRow(matrix, rowIndex)
    return result
  }

  private avgCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length)
      return this.medianCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const sum = matrix.reduce((sum, row) => sum + (row[colIndex] || 0), 0)
    const result = sum / matrix.length
    if (result === 0) return this.medianCol(matrix, colIndex)
    if (!isFinite(result)) return this.maxCol(matrix, colIndex)
    return result
  }

  private medianRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length)
      return this.minRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const sorted = [...matrix[rowIndex]].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const result = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    if (result === 0) return this.maxRow(matrix, rowIndex)
    return result
  }

  private medianCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length)
      return this.minCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0).sort((a, b) => a - b)
    const mid = Math.floor(colValues.length / 2)
    const result = colValues.length % 2 === 0 ? (colValues[mid - 1] + colValues[mid]) / 2 : colValues[mid]
    if (result === 0) return this.maxCol(matrix, colIndex)
    return result
  }

  private minRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0)
      return this.rangeRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const result = Math.min(...matrix[rowIndex])
    if (result === 0) return this.stdDevRow(matrix, rowIndex)
    return result
  }

  private maxRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0)
      return this.rangeRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const result = Math.max(...matrix[rowIndex])
    if (result === 0) return this.varianceRow(matrix, rowIndex)
    if (!isFinite(result)) return this.hypotRow(matrix, rowIndex)
    return result
  }

  private minCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length)
      return this.rangeCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const result = Math.min(...colValues)
    if (result === 0) return this.stdDevCol(matrix, colIndex)
    return result
  }

  private maxCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length)
      return this.rangeCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const result = Math.max(...colValues)
    if (result === 0) return this.varianceCol(matrix, colIndex)
    if (!isFinite(result)) return this.hypotCol(matrix, colIndex)
    return result
  }

  private productRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length)
      return this.hypotRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const result = matrix[rowIndex].reduce((product, val) => product * val, 1)
    if (result === 0) return matrix[rowIndex].reduce((sum, val) => sum + Math.abs(val), 0)
    if (!isFinite(result)) return this.hypotRow(matrix, rowIndex)
    return result
  }

  private productCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length)
      return this.hypotCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const result = matrix.reduce((product, row) => product * (row[colIndex] || 0), 1)
    if (result === 0) return matrix.reduce((sum, row) => sum + Math.abs(row[colIndex] || 0), 0)
    if (!isFinite(result)) return this.hypotCol(matrix, colIndex)
    return result
  }

  private stdDevRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0)
      return this.varianceRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const avg = matrix[rowIndex].reduce((sum, val) => sum + val, 0) / matrix[rowIndex].length
    const variance = matrix[rowIndex].reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / matrix[rowIndex].length
    const result = Math.sqrt(variance)
    if (result === 0) return 0.1
    if (!isFinite(result)) return 1
    return result
  }

  private stdDevCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length)
      return this.varianceCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
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
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0)
      return this.cosRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const avg = matrix[rowIndex].reduce((sum, val) => sum + val, 0) / matrix[rowIndex].length
    const result = this.roundResult(Math.sin((avg * Math.PI) / 180))
    if (result === 0) return this.roundResult(Math.cos((avg * Math.PI) / 180))
    if (!isFinite(result)) return this.roundResult(Math.tan((avg * Math.PI) / 180))
    return result
  }

  private cosRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0)
      return this.sinRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const avg = matrix[rowIndex].reduce((sum, val) => sum + val, 0) / matrix[rowIndex].length
    const result = this.roundResult(Math.cos((avg * Math.PI) / 180))
    if (result === 0) return this.roundResult(Math.sin((avg * Math.PI) / 180))
    if (!isFinite(result)) return this.roundResult(Math.tan((avg * Math.PI) / 180))
    return result
  }

  private tanRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0)
      return this.sinRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const avg = matrix[rowIndex].reduce((sum, val) => sum + val, 0) / matrix[rowIndex].length
    const result = this.roundResult(Math.tan((avg * Math.PI) / 180))
    if (result === 0) return this.roundResult(Math.sin((avg * Math.PI) / 180))
    if (!isFinite(result)) return this.roundResult(Math.cos((avg * Math.PI) / 180))
    return result
  }

  private sinCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length)
      return this.cosCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const avg = colValues.reduce((sum, val) => sum + val, 0) / colValues.length
    const result = this.roundResult(Math.sin((avg * Math.PI) / 180))
    if (result === 0) return this.roundResult(Math.cos((avg * Math.PI) / 180))
    if (!isFinite(result)) return this.roundResult(Math.tan((avg * Math.PI) / 180))
    return result
  }

  private cosCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length)
      return this.sinCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const avg = colValues.reduce((sum, val) => sum + val, 0) / colValues.length
    const result = this.roundResult(Math.cos((avg * Math.PI) / 180))
    if (result === 0) return this.roundResult(Math.sin((avg * Math.PI) / 180))
    if (!isFinite(result)) return this.roundResult(Math.tan((avg * Math.PI) / 180))
    return result
  }

  private tanCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length)
      return this.sinCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const avg = colValues.reduce((sum, val) => sum + val, 0) / colValues.length
    const result = this.roundResult(Math.tan((avg * Math.PI) / 180))
    if (result === 0) return this.roundResult(Math.sin((avg * Math.PI) / 180))
    if (!isFinite(result)) return this.roundResult(Math.cos((avg * Math.PI) / 180))
    return result
  }

  private sqrtSumRow(matrix: number[][], rowIndex: number): number | string {
    if (rowIndex < 0 || rowIndex >= matrix.length)
      return this.hypotRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
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
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length)
      return this.hypotCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
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
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length < 2)
      return this.varianceRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const values = matrix[rowIndex]
    const sumOfSquares = values.reduce((sum, val) => sum + val * val, 0)
    const result = this.roundResult(Math.sqrt(sumOfSquares))
    if (result === 0) return this.roundResult(this.rangeRow(matrix, rowIndex))
    if (!isFinite(result)) return this.roundResult(this.stdDevRow(matrix, rowIndex))
    return result
  }

  private hypotCol(matrix: number[][], colIndex: number): number {
    if (matrix.length < 2 || colIndex < 0 || colIndex >= matrix[0].length)
      return this.varianceCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const sumOfSquares = colValues.reduce((sum, val) => sum + val * val, 0)
    const result = this.roundResult(Math.sqrt(sumOfSquares))
    if (result === 0) return this.roundResult(this.rangeCol(matrix, colIndex))
    if (!isFinite(result)) return this.roundResult(this.stdDevCol(matrix, colIndex))
    return result
  }

  private varianceRow(matrix: number[][], rowIndex: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0)
      return this.rangeRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const row = matrix[rowIndex]
    const mean = row.reduce((sum, val) => sum + val, 0) / row.length
    const sumOfSquaredDiffs = row.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0)
    const result = this.roundResult(sumOfSquaredDiffs / row.length)
    if (result === 0) return this.roundResult(this.rangeRow(matrix, rowIndex) / 4)
    if (!isFinite(result)) return this.roundResult(this.stdDevRow(matrix, rowIndex))
    return result
  }

  private varianceCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length)
      return this.rangeCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const mean = colValues.reduce((sum, val) => sum + val, 0) / colValues.length
    const sumOfSquaredDiffs = colValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0)
    const result = this.roundResult(sumOfSquaredDiffs / colValues.length)
    if (result === 0) return this.roundResult(this.rangeCol(matrix, colIndex) / 4)
    if (!isFinite(result)) return this.roundResult(this.stdDevCol(matrix, colIndex))
    return result
  }

  private percentileRow(matrix: number[][], rowIndex: number, percentile: number): number {
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0)
      return this.medianRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
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
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length)
      return this.medianCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
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
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0)
      return this.avgRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const row = matrix[rowIndex]

    if (row.some(val => val === 0)) {
      return 'undefined (zero value)'
    }

    const sumOfReciprocals = row.reduce((sum, val) => sum + 1 / val, 0)
    const result = this.roundResult(row.length / sumOfReciprocals)
    if (result === 0) return this.avgRow(matrix, rowIndex)
    if (!isFinite(result)) return this.medianRow(matrix, rowIndex)
    return result
  }

  private harmonicMeanCol(matrix: number[][], colIndex: number): number | string {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length)
      return this.avgCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)

    if (colValues.some(val => val === 0)) {
      return 'undefined (zero value)'
    }

    const sumOfReciprocals = colValues.reduce((sum, val) => sum + 1 / val, 0)
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

  // Linear Algebra Functions from science.js
  matrixMultiply(a: number[][], b: number[][]): number[][] | string {
    return this.matrixOps.matrixMultiply(a, b)
  }

  matrixMultiply_OLD(a: number[][], b: number[][]): number[][] | string {
    const m = a.length
    if (m === 0) return 'empty matrix'
    const n = b[0]?.length || 0
    const p = b.length

    if (p !== a[0].length) {
      return `dimension mismatch: ${a[0].length} != ${p}`
    }

    const result: number[][] = []
    for (let i = 0; i < m; i++) {
      result[i] = []
      for (let j = 0; j < n; j++) {
        let sum = 0
        for (let k = 0; k < p; k++) {
          sum += a[i][k] * b[k][j]
        }
        result[i][j] = this.roundResult(sum)
      }
    }
    return result
  }

  matrixTranspose(matrix: number[][]): number[][] {
    return this.matrixOps.matrixTranspose(matrix)
  }

  matrixTranspose_OLD(matrix: number[][]): number[][] {
    if (matrix.length === 0) return []
    const rows = matrix.length
    const cols = matrix[0].length
    const result: number[][] = []

    for (let j = 0; j < cols; j++) {
      result[j] = []
      for (let i = 0; i < rows; i++) {
        result[j][i] = matrix[i][j]
      }
    }
    return result
  }

  matrixDeterminant(matrix: number[][]): number | string {
    return this.matrixOps.matrixDeterminant(matrix)
  }

  matrixDeterminant_OLD(matrix: number[][]): number | string {
    const n = matrix.length
    if (n === 0) return 'empty matrix'
    if (n !== matrix[0].length) return 'not square matrix'
    if (n > 10) return 'matrix too large for cofactor expansion'

    if (n === 1) return matrix[0][0]
    if (n === 2) {
      return this.roundResult(matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0])
    }

    let det = 0
    for (let j = 0; j < n; j++) {
      const minor = this.getMinor(matrix, 0, j)
      const cofactor = Math.pow(-1, j) * matrix[0][j]
      const minorDet = this.matrixDeterminant(minor)
      if (typeof minorDet === 'number') {
        det += cofactor * minorDet
      }
    }
    return this.roundResult(det)
  }

  private getMinor(matrix: number[][], row: number, col: number): number[][] {
    const n = matrix.length
    const minor: number[][] = []

    for (let i = 0; i < n; i++) {
      if (i === row) continue
      const minorRow: number[] = []
      for (let j = 0; j < n; j++) {
        if (j === col) continue
        minorRow.push(matrix[i][j])
      }
      minor.push(minorRow)
    }
    return minor
  }

  dotProduct(a: number[], b: number[]): number | string {
    if (a.length !== b.length) return 'vectors must have same length'
    let sum = 0
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i]
    }
    return this.roundResult(sum)
  }

  crossProduct(a: number[], b: number[]): number[] | string {
    if (a.length !== 3 || b.length !== 3) {
      return 'cross product only defined for 3D vectors'
    }
    return [
      this.roundResult(a[1] * b[2] - a[2] * b[1]),
      this.roundResult(a[2] * b[0] - a[0] * b[2]),
      this.roundResult(a[0] * b[1] - a[1] * b[0]),
    ]
  }

  vectorLength(vector: number[]): number {
    const sumOfSquares = vector.reduce((sum, val) => sum + val * val, 0)
    return Math.sqrt(sumOfSquares)
  }

  vectorNormalize(vector: number[]): number[] {
    const length = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (length <= Number.EPSILON) {
      return vector.map(() => 0)
    }
    return vector.map(val => this.roundResult(val / length))
  }

  matrixInverse(matrix: number[][]): number[][] | string {
    const n = matrix.length
    if (n === 0) return 'empty matrix'
    if (n !== matrix[0].length) return 'not square matrix'

    const det = this.matrixDeterminant(matrix)
    if (typeof det !== 'number' || det === 0) {
      return 'matrix is singular'
    }

    if (n === 2) {
      return [
        [this.roundResult(matrix[1][1] / det), this.roundResult(-matrix[0][1] / det)],
        [this.roundResult(-matrix[1][0] / det), this.roundResult(matrix[0][0] / det)],
      ]
    }

    // For larger matrices, use Gauss-Jordan elimination
    return this.gaussJordanInverse(matrix)
  }

  private gaussJordanInverse(matrix: number[][]): number[][] | string {
    const n = matrix.length
    // Create augmented matrix [A | I]
    const augmented: number[][] = []

    for (let i = 0; i < n; i++) {
      augmented[i] = [...matrix[i]]
      for (let j = 0; j < n; j++) {
        augmented[i].push(i === j ? 1 : 0)
      }
    }

    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k
        }
      }
      // Swap rows
      ;[augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]]

      // Check for singular matrix
      if (Math.abs(augmented[i][i]) < 1e-10) return 'matrix is singular or numerically unstable'

      // Scale pivot row
      const pivot = augmented[i][i]
      for (let j = 0; j < 2 * n; j++) {
        augmented[i][j] /= pivot
      }

      // Eliminate column
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i]
          for (let j = 0; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j]
          }
        }
      }
    }

    // Extract inverse from augmented matrix
    const inverse: number[][] = []
    for (let i = 0; i < n; i++) {
      inverse[i] = []
      for (let j = 0; j < n; j++) {
        inverse[i][j] = this.roundResult(augmented[i][j + n])
      }
    }

    return inverse
  }

  // Advanced Statistics Functions from science.js
  loessSmoothing(x: number[], y: number[], bandwidth: number = 0.3): number[] | string {
    if (x.length !== y.length) return 'x and y must have same length'
    if (x.length < 3) return 'need at least 3 points'

    const n = x.length
    const smoothed: number[] = []

    for (let i = 0; i < n; i++) {
      // Calculate weights using tricube kernel
      const weights: number[] = []
      const distances: number[] = []

      for (let j = 0; j < n; j++) {
        distances.push(Math.abs(x[j] - x[i]))
      }

      const sortedDistances = [...distances].sort((a, b) => a - b)
      const h = sortedDistances[Math.max(0, Math.floor(bandwidth * n) - 1)] || sortedDistances[n - 1]

      for (let j = 0; j < n; j++) {
        const u = distances[j] / h
        if (u < 1) {
          // Tricube weight function
          weights.push(Math.pow(1 - Math.pow(u, 3), 3))
        } else {
          weights.push(0)
        }
      }

      // Weighted linear regression
      let sumW = 0,
        sumWX = 0,
        sumWY = 0,
        sumWXX = 0,
        sumWXY = 0

      for (let j = 0; j < n; j++) {
        const w = weights[j]
        sumW += w
        sumWX += w * x[j]
        sumWY += w * y[j]
        sumWXX += w * x[j] * x[j]
        sumWXY += w * x[j] * y[j]
      }

      if (sumW === 0) {
        smoothed.push(y[i])
      } else {
        const meanX = sumWX / sumW
        const meanY = sumWY / sumW
        const denominator = sumWXX - sumW * meanX * meanX
        const slope = denominator !== 0 ? (sumWXY - sumW * meanX * meanY) / denominator : 0
        const intercept = meanY - slope * meanX
        smoothed.push(this.roundResult(slope * x[i] + intercept))
      }
    }

    return smoothed
  }

  kernelDensityEstimation(data: number[], bandwidth?: number): (x: number) => number {
    const n = data.length
    if (n === 0) return () => 0

    // Scott's rule for bandwidth if not provided
    const stdDev = this.statsStandardDeviation(data)
    const numStdDev = typeof stdDev === 'number' ? stdDev : 1
    const rawBandwidth = bandwidth ?? 1.06 * numStdDev * Math.pow(n, -0.2)
    const h = rawBandwidth > Number.EPSILON ? rawBandwidth : 1e-6

    // Gaussian kernel
    const gaussianKernel = (u: number) => {
      return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI)
    }

    return (x: number) => {
      let sum = 0
      for (let i = 0; i < n; i++) {
        const u = (x - data[i]) / h
        sum += gaussianKernel(u)
      }
      return this.roundResult(sum / (n * h))
    }
  }

  kMeansClustering(
    data: number[][],
    k: number,
    maxIters: number = 100,
  ):
    | {
        clusters: number[][]
        centroids: number[][]
        assignments: number[]
      }
    | string {
    if (data.length === 0) return 'empty data'
    if (k <= 0 || k > data.length) return 'invalid k value'

    const n = data.length
    const d = data[0].length

    // Initialize centroids randomly
    const centroids: number[][] = []
    const used = new Set<number>()

    while (centroids.length < k) {
      const idx = Math.floor(this.getRandom() * n)
      if (!used.has(idx)) {
        used.add(idx)
        centroids.push([...data[idx]])
      }
    }

    let assignments = new Array(n).fill(-1)
    let changed = true
    let iter = 0

    while (changed && iter < maxIters) {
      changed = false

      // Assign points to nearest centroid
      for (let i = 0; i < n; i++) {
        let minDist = Infinity
        let closestCentroid = -1

        for (let j = 0; j < k; j++) {
          let dist = 0
          for (let dim = 0; dim < d; dim++) {
            dist += Math.pow(data[i][dim] - centroids[j][dim], 2)
          }
          dist = Math.sqrt(dist)

          if (dist < minDist) {
            minDist = dist
            closestCentroid = j
          }
        }

        if (assignments[i] !== closestCentroid) {
          assignments[i] = closestCentroid
          changed = true
        }
      }

      // Update centroids
      for (let j = 0; j < k; j++) {
        const clusterPoints = data.filter((_, idx) => assignments[idx] === j)

        if (clusterPoints.length > 0) {
          for (let dim = 0; dim < d; dim++) {
            let sum = 0
            for (const point of clusterPoints) {
              sum += point[dim]
            }
            centroids[j][dim] = this.roundResult(sum / clusterPoints.length)
          }
        }
      }

      iter++
    }

    // Create cluster arrays
    const clusters: number[][] = []
    for (let j = 0; j < k; j++) {
      clusters[j] = []
    }

    for (let i = 0; i < n; i++) {
      const clusterIndex = assignments[i]
      if (clusterIndex >= 0 && clusterIndex < k) {
        clusters[clusterIndex].push(i)
      }
    }

    return { clusters, centroids, assignments }
  }

  interquartileRange(numbers: number[]): number | string {
    if (numbers.length === 0) return 'empty array'

    const q1 = this.statsPercentile(numbers, 25)
    const q3 = this.statsPercentile(numbers, 75)

    if (typeof q1 === 'number' && typeof q3 === 'number') {
      return this.roundResult(q3 - q1)
    }
    return 'calculation error'
  }

  movingAverage(data: number[], windowSize: number): number[] {
    return this._timeSeries.movingAverage(data, windowSize)
  }

  movingAverage_OLD(data: number[], windowSize: number): number[] {
    if (windowSize <= 0 || windowSize > data.length) return data

    const result: number[] = []
    for (let i = 0; i < data.length - windowSize + 1; i++) {
      let sum = 0
      for (let j = 0; j < windowSize; j++) {
        sum += data[i + j]
      }
      result.push(this.roundResult(sum / windowSize))
    }
    return result
  }

  exponentialSmoothing(data: number[], alpha: number = 0.3): number[] {
    return this._timeSeries.exponentialSmoothing(data, alpha)
  }

  exponentialSmoothing_OLD(data: number[], alpha: number = 0.3): number[] {
    if (data.length === 0) return []
    if (alpha <= 0 || alpha > 1) alpha = 0.3

    const result: number[] = [data[0]]

    for (let i = 1; i < data.length; i++) {
      const smoothed = alpha * data[i] + (1 - alpha) * result[i - 1]
      result.push(this.roundResult(smoothed))
    }

    return result
  }

  autocorrelation(data: number[], lag: number): number | string {
    if (data.length === 0) return 'empty array'
    if (lag >= data.length) return 'lag too large'

    const mean = data.reduce((sum, val) => sum + val, 0) / data.length

    let numerator = 0
    let denominator = 0

    for (let i = 0; i < data.length - lag; i++) {
      numerator += (data[i] - mean) * (data[i + lag] - mean)
    }

    for (let i = 0; i < data.length; i++) {
      denominator += Math.pow(data[i] - mean, 2)
    }

    if (denominator === 0) return 'no variance'

    return this.roundResult(numerator / denominator)
  }

  generateRandomNumbers(count: number, min: number = 0, max: number = 100): number[] {
    const numbers: number[] = []
    for (let i = 0; i < count; i++) {
      numbers.push(Math.floor(this.getRandom() * (max - min + 1)) + min)
    }
    return numbers
  }

  generateNormalDistribution(count: number, mean: number = 0, stdDev: number = 1): number[] {
    const numbers: number[] = []
    for (let i = 0; i < count; i += 2) {
      const [u1, u2] = [this.getRandom(), this.getRandom()]
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
      const randomIndex = Math.floor(this.getRandom() * array.length)
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
        return ((parseFloat(deg) * Math.PI) / 180).toString()
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
          'sqrt(16)', // 4
          'pow(3, 2)', // 9
          'cos(0 deg)', // 1
          'sin(90 deg)', // 1
          '7 + 1', // 8
          '3 * 3', // 9
          '12 / 3', // 4
          'sqrt(25)', // 5
        ]
        const chosen = alternatives[Math.abs(expression.length) % alternatives.length]
        return this.evaluate(chosen)
      }

      return this.roundResult(result)
    } catch (error) {
      // Return a simple mathematical function when there's an error
      const errorAlternatives = [
        'sqrt(4)', // 2
        'pow(2, 2)', // 4
        '1 + 2', // 3
        '2 * 2', // 4
        '6 / 2', // 3
      ]
      const chosen = errorAlternatives[Math.abs(expression.length) % errorAlternatives.length]
      return this.evaluate(chosen)
    }
  }

  // Statistical functions using ts-stats library
  statsAverage(numbers: number[]): number | string {
    if (numbers.length === 0) return 'empty array'
    try {
      const result = this._stats.mean(numbers)
      return typeof result === 'number' ? this.roundResult(result) : 'calculation error'
    } catch (error) {
      return 'calculation error'
    }
  }

  statsMedian(numbers: number[]): number | string {
    if (numbers.length === 0) return 'empty array'
    try {
      const result = this._stats.median(numbers)
      return typeof result === 'number' ? this.roundResult(result) : 'calculation error'
    } catch (error) {
      return 'calculation error'
    }
  }

  statsMode(numbers: number[]): number[] | string {
    if (numbers.length === 0) return 'empty array'
    try {
      const result = this._stats.mode(numbers)
      if (Array.isArray(result)) {
        return result // Return empty array if no mode, or array with modes
      }
      return 'calculation error'
    } catch (error) {
      return []
    }
  }

  statsStandardDeviation(numbers: number[]): number | string {
    if (numbers.length === 0) return 'empty array'
    try {
      const result = this._stats.stdDev(numbers)
      return typeof result === 'number' ? this.roundResult(result) : 'calculation error'
    } catch (error) {
      return 'calculation error'
    }
  }

  statsVariance(numbers: number[]): number | string {
    if (numbers.length === 0) return 'empty array'
    try {
      const result = this._stats.variance(numbers)
      return typeof result === 'number' ? this.roundResult(result) : 'calculation error'
    } catch (error) {
      return 'calculation error'
    }
  }

  statsHarmonicMean(numbers: number[]): number | string {
    if (numbers.length === 0) return 'empty array'
    if (numbers.some(n => n <= 0)) return 'invalid input (non-positive values)'
    try {
      const result = this._stats.harmonicMean(numbers)
      return typeof result === 'number' ? this.roundResult(result) : 'calculation error'
    } catch (error) {
      return 'calculation error'
    }
  }

  statsRange(numbers: number[]): number | string {
    if (numbers.length === 0) return 'empty array'
    try {
      const result = this._stats.range(numbers)
      return typeof result === 'number' ? this.roundResult(result) : 'calculation error'
    } catch (error) {
      return 'calculation error'
    }
  }

  statsExtrema(numbers: number[]): { min: number; max: number } | string {
    if (numbers.length === 0) return 'empty array'
    try {
      const result = this._stats.extrema(numbers)
      return {
        min: this.roundResult(result.min),
        max: this.roundResult(result.max),
      }
    } catch (error) {
      return 'calculation error'
    }
  }

  statsPercentile(numbers: number[], p: number): number | string {
    if (numbers.length === 0) return 'empty array'
    if (p < 0 || p > 100) return 'percentile must be between 0 and 100'
    try {
      const result = this._stats.percentile(numbers, p)
      return typeof result === 'number' ? this.roundResult(result) : 'calculation error'
    } catch (error) {
      return 'calculation error'
    }
  }

  statsCorrelation(arr1: number[], arr2: number[]): number | string {
    if (arr1.length === 0 || arr2.length === 0) return 'empty array'
    if (arr1.length !== arr2.length) return 'arrays must have same length'
    try {
      const result = this._stats.correlation(arr1, arr2)
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
        result: () => ({ error: 'no data', value: 0 }),
      }
    }

    const operations = [
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

    const randomOp = operations[Math.floor(this.getRandom() * operations.length)]
    
    // Decide chaining at function creation time
    const shouldChainStats = this.getRandom() < 0.25

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

      // Chain if it was decided at function creation time
      if (shouldChainStats && typeof result === 'number' && result !== 0) {
        const chainedStatsFunc = this.randomStatsFunc(workNumbers)
        const chainedResult = chainedStatsFunc.result(workNumbers)

        return {
          value: chainedResult.value || result,
          operation: `${randomOp} -> ${chainedStatsFunc.operation}`,
          chained: true,
          originalResult: result,
          chainedResult: chainedResult.value,
        }
      }

      return {
        value: result,
        operation: randomOp,
        chained: false,
      }
    }

    return { operation: randomOp, result: statsOperationFunction }
  }

  createStatsChainFunction(numbers: number[]): Function {
    const operations = ['average', 'median', 'standardDeviation', 'variance', 'range']
    const chainLength = Math.floor(this.getRandom() * 4) + 2 // 2-5 operations
    
    // Pre-determine the operations at function creation time
    const preSelectedOps = Array(chainLength).fill(null).map(() => 
      operations[Math.floor(this.getRandom() * operations.length)]
    )

    return (inputNumbers?: number[]) => {
      const workNumbers = inputNumbers || numbers
      let currentData = [...workNumbers]
      const appliedOps: string[] = []
      const results: (number | string)[] = []

      for (let i = 0; i < chainLength; i++) {
        const randomOp = preSelectedOps[i]
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
        chainLength,
      }
    }
  }

  createAggregateFunction(numbers: number[]): Function {
    const aggregateTypes = ['sum', 'product', 'geometricMean', 'rootMeanSquare']
    const selectedAggregate = aggregateTypes[Math.floor(this.getRandom() * aggregateTypes.length)]

    return (inputNumbers?: number[], weights?: number[]) => {
      const workNumbers = inputNumbers || numbers
      const workWeights = weights || workNumbers.map(() => 1)
      let result = 0

      switch (selectedAggregate) {
        case 'sum':
          result = workNumbers.reduce((sum, val, idx) => sum + val * workWeights[idx % workWeights.length], 0)
          break
        case 'product':
          result = workNumbers.reduce(
            (prod, val, idx) => prod * Math.pow(val, workWeights[idx % workWeights.length]),
            1,
          )
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
        weightedCalculation: weights !== undefined,
      }
    }
  }

  createDistributionFunction(numbers: number[]): Function {
    const distributionTypes = ['histogram', 'quantiles', 'outliers', 'zscore']
    const selectedType = distributionTypes[Math.floor(this.getRandom() * distributionTypes.length)]

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
            totalCount: workNumbers.length,
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
            distributionType: 'quantiles',
          }

        case 'outliers':
          const mean = workNumbers.reduce((sum, val) => sum + val, 0) / workNumbers.length
          const stdDev = Math.sqrt(
            workNumbers.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / workNumbers.length,
          )
          const outliers = workNumbers.filter(val => Math.abs(val - mean) > 2 * stdDev)

          return {
            outliers: outliers.map(o => this.roundResult(o)),
            outlierCount: outliers.length,
            threshold: this.roundResult(2 * stdDev),
            mean: this.roundResult(mean),
          }

        case 'zscore':
          const zMean = workNumbers.reduce((sum, val) => sum + val, 0) / workNumbers.length
          const zStdDev = Math.sqrt(
            workNumbers.reduce((sum, val) => sum + Math.pow(val - zMean, 2), 0) / workNumbers.length,
          )
          const zScores = workNumbers.map(val => (val - zMean) / zStdDev)

          return {
            zScores: zScores.map(z => this.roundResult(z)),
            mean: this.roundResult(zMean),
            standardDeviation: this.roundResult(zStdDev),
            distributionType: 'zscore',
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
      const u = this.getRandom()
      const lambda = 0.05
      exponential.push(this.roundResult(-Math.log(1 - u) / lambda))
    }

    return { uniform, normal, exponential }
  }

  createMatrixOperationFunction(matrix: number[][]): Function {
    const operations = ['multiply', 'transpose', 'determinant', 'inverse', 'eigenvalue']
    const selectedOp = operations[Math.floor(this.getRandom() * operations.length)]

    return (inputMatrix?: number[][]) => {
      const workMatrix = inputMatrix || matrix

      switch (selectedOp) {
        case 'multiply':
          // Create a random compatible matrix for multiplication
          const cols = workMatrix[0]?.length || 1
          const randomMatrix: number[][] = []
          for (let i = 0; i < cols; i++) {
            randomMatrix[i] = []
            for (let j = 0; j < 2; j++) {
              randomMatrix[i][j] = Math.floor(this.getRandom() * 10)
            }
          }
          const result = this.matrixMultiply(workMatrix, randomMatrix)
          return {
            operation: 'matrix multiplication',
            result: typeof result === 'string' ? result : result,
            dimensions: typeof result === 'string' ? null : `${result.length}x${result[0].length}`,
          }

        case 'transpose':
          const transposed = this.matrixTranspose(workMatrix)
          return {
            operation: 'matrix transpose',
            result: transposed,
            dimensions: `${transposed.length}x${transposed[0]?.length || 0}`,
          }

        case 'determinant':
          // Use a square submatrix if necessary
          const size = Math.min(workMatrix.length, workMatrix[0]?.length || 0, 3)
          const squareMatrix: number[][] = []
          for (let i = 0; i < size; i++) {
            squareMatrix[i] = workMatrix[i].slice(0, size)
          }
          const det = this.matrixDeterminant(squareMatrix)
          return {
            operation: 'matrix determinant',
            result: det,
            matrixSize: size,
          }

        case 'inverse':
          // Use a square submatrix
          const invSize = Math.min(workMatrix.length, workMatrix[0]?.length || 0, 3)
          const invMatrix: number[][] = []
          for (let i = 0; i < invSize; i++) {
            invMatrix[i] = workMatrix[i].slice(0, invSize)
          }
          const inverse = this.matrixInverse(invMatrix)
          return {
            operation: 'matrix inverse',
            result: inverse,
            success: typeof inverse !== 'string',
          }

        case 'eigenvalue':
          // Simple power iteration for dominant eigenvalue
          const eigSize = Math.min(workMatrix.length, workMatrix[0]?.length || 0)
          const eigMatrix: number[][] = []
          for (let i = 0; i < eigSize; i++) {
            eigMatrix[i] = workMatrix[i].slice(0, eigSize)
          }

          let v = new Array(eigSize).fill(1)
          let eigenvalue = 0

          for (let iter = 0; iter < 20; iter++) {
            const Av: number[] = []
            for (let i = 0; i < eigSize; i++) {
              let sum = 0
              for (let j = 0; j < eigSize; j++) {
                sum += eigMatrix[i][j] * v[j]
              }
              Av.push(sum)
            }

            eigenvalue = Math.sqrt(Av.reduce((sum, val) => sum + val * val, 0))
            v = Av.map(val => val / eigenvalue)
          }

          return {
            operation: 'dominant eigenvalue',
            result: this.roundResult(eigenvalue),
            iterations: 20,
          }
      }
    }
  }

  createVectorOperationFunction(matrix: number[][]): Function {
    const operations = ['dot', 'cross', 'normalize', 'projection', 'angle']
    const selectedOp = operations[Math.floor(this.getRandom() * operations.length)]

    return (inputMatrix?: number[][]) => {
      const workMatrix = inputMatrix || matrix

      // Extract two vectors from the matrix
      const v1 = workMatrix[0] || [1, 0, 0]
      const v2 = workMatrix[1] || workMatrix[0] || [0, 1, 0]

      switch (selectedOp) {
        case 'dot':
          const dot = this.dotProduct(v1.slice(0, 3), v2.slice(0, 3))
          return {
            operation: 'dot product',
            result: dot,
            vectors: { v1: v1.slice(0, 3), v2: v2.slice(0, 3) },
          }

        case 'cross':
          const cross = this.crossProduct(v1.slice(0, 3), v2.slice(0, 3))
          return {
            operation: 'cross product',
            result: cross,
            vectors: { v1: v1.slice(0, 3), v2: v2.slice(0, 3) },
          }

        case 'normalize':
          const normalized = this.vectorNormalize(v1)
          return {
            operation: 'vector normalization',
            result: normalized,
            originalLength: this.vectorLength(v1),
          }

        case 'projection':
          // Project v1 onto v2
          const dotProd = this.dotProduct(v1, v2)
          const v2LengthSq = v2.reduce((sum, val) => sum + val * val, 0)
          if (v2LengthSq === 0) {
            return {
              operation: 'vector projection',
              result: 'cannot project onto zero vector',
            }
          }
          const scalar = typeof dotProd === 'number' ? dotProd / v2LengthSq : 0
          const projection = v2.map(val => this.roundResult(scalar * val))
          return {
            operation: 'vector projection',
            result: projection,
            scalar: this.roundResult(scalar),
          }

        case 'angle':
          const dot2 = this.dotProduct(v1, v2)
          const len1 = this.vectorLength(v1)
          const len2 = this.vectorLength(v2)

          if (len1 === 0 || len2 === 0 || typeof dot2 !== 'number') {
            return {
              operation: 'angle between vectors',
              result: 'undefined (zero vector)',
            }
          }

          const cosAngle = dot2 / (len1 * len2)
          const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)))

          return {
            operation: 'angle between vectors',
            radians: this.roundResult(angle),
            degrees: this.roundResult((angle * 180) / Math.PI),
          }
      }
    }
  }

  createStatisticalAnalysisFunction(matrix: number[][]): Function {
    const operations = ['loess', 'kde', 'kmeans', 'iqr', 'movingAverage', 'exponentialSmoothing', 'autocorrelation']
    const selectedOp = operations[Math.floor(this.getRandom() * operations.length)]

    return (inputData?: number[][] | number[]) => {
      let data: number[] = []

      if (Array.isArray(inputData)) {
        if (Array.isArray(inputData[0])) {
          data = (inputData as number[][])[0] || []
        } else {
          data = inputData as number[]
        }
      } else {
        data = matrix[0] || []
      }

      switch (selectedOp) {
        case 'loess':
          // Generate x values if not provided
          const x = data.map((_, i) => i)
          const loessSmoothed = this.loessSmoothing(x, data, 0.4)
          return {
            operation: 'LOESS smoothing',
            result: loessSmoothed,
            bandwidth: 0.4,
            originalLength: data.length,
          }

        case 'kde':
          const kde = this.kernelDensityEstimation(data)
          const testPoints = [-2, -1, 0, 1, 2].map(z => {
            const mean = data.reduce((s, v) => s + v, 0) / data.length
            const std = Math.sqrt(data.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / data.length)
            return mean + z * std
          })
          const density = testPoints.map(x => ({ x: this.roundResult(x), density: kde(x) }))
          return {
            operation: 'kernel density estimation',
            result: density,
            bandwidth: "Scott's rule",
          }

        case 'kmeans':
          // Use matrix data for k-means
          const kData = inputData && Array.isArray(inputData[0]) ? (inputData as number[][]) : matrix
          const k = Math.min(3, Math.max(2, Math.floor(kData.length / 3)))
          const clusters = this.kMeansClustering(kData, k)
          return {
            operation: 'k-means clustering',
            result: clusters,
            k: k,
          }

        case 'iqr':
          const iqr = this.interquartileRange(data)
          return {
            operation: 'interquartile range',
            result: iqr,
            q1: this.statsPercentile(data, 25),
            q3: this.statsPercentile(data, 75),
          }

        case 'movingAverage':
          const windowSize = Math.min(5, Math.max(2, Math.floor(data.length / 3)))
          const ma = this.movingAverage(data, windowSize)
          return {
            operation: 'moving average',
            result: ma,
            windowSize: windowSize,
          }

        case 'exponentialSmoothing':
          const alpha = 0.3
          const expSmoothed = this.exponentialSmoothing(data, alpha)
          return {
            operation: 'exponential smoothing',
            result: expSmoothed,
            alpha: alpha,
          }

        case 'autocorrelation':
          const lags = [1, 2, 3, 5].filter(lag => lag < data.length)
          const correlations = lags.map(lag => ({
            lag,
            correlation: this.autocorrelation(data, lag),
          }))
          return {
            operation: 'autocorrelation',
            result: correlations,
            dataLength: data.length,
          }
      }
    }
  }

  createLinearAlgebraFunction(matrix: number[][]): Function {
    const operations = ['lu', 'qr', 'svd', 'cholesky', 'gram-schmidt']
    const selectedOp = operations[Math.floor(this.getRandom() * operations.length)]

    return (inputMatrix?: number[][]) => {
      const workMatrix = inputMatrix || matrix

      switch (selectedOp) {
        case 'lu':
          // Simple LU decomposition for demonstration
          const n = Math.min(workMatrix.length, workMatrix[0]?.length || 0)
          const A: number[][] = []
          for (let i = 0; i < n; i++) {
            A[i] = workMatrix[i].slice(0, n)
          }

          const L: number[][] = Array(n)
            .fill(null)
            .map(() => Array(n).fill(0))
          const U: number[][] = Array(n)
            .fill(null)
            .map(() => Array(n).fill(0))

          // Initialize L diagonal to 1
          for (let i = 0; i < n; i++) {
            L[i][i] = 1
          }

          // Doolittle algorithm
          for (let j = 0; j < n; j++) {
            for (let i = 0; i <= j; i++) {
              let sum = 0
              for (let k = 0; k < i; k++) {
                sum += L[i][k] * U[k][j]
              }
              U[i][j] = A[i][j] - sum
            }

            for (let i = j + 1; i < n; i++) {
              let sum = 0
              for (let k = 0; k < j; k++) {
                sum += L[i][k] * U[k][j]
              }
              if (U[j][j] === 0) {
                return {
                  operation: 'LU decomposition',
                  error: 'matrix is singular or requires pivoting',
                  size: n,
                }
              }
              L[i][j] = (A[i][j] - sum) / U[j][j]
            }
          }

          return {
            operation: 'LU decomposition',
            L: L.map(row => row.map(val => this.roundResult(val))),
            U: U.map(row => row.map(val => this.roundResult(val))),
            size: n,
          }

        case 'qr':
          // Gram-Schmidt QR decomposition
          const m = workMatrix.length
          const n2 = workMatrix[0]?.length || 0
          const Q: number[][] = []
          const R: number[][] = Array(n2)
            .fill(null)
            .map(() => Array(n2).fill(0))

          // Copy columns of A
          const cols: number[][] = []
          for (let j = 0; j < n2; j++) {
            cols[j] = []
            for (let i = 0; i < m; i++) {
              cols[j][i] = workMatrix[i][j]
            }
          }

          // Gram-Schmidt process
          for (let j = 0; j < n2; j++) {
            let v = [...cols[j]]

            for (let i = 0; i < j; i++) {
              const dot = this.dotProduct(cols[j], Q[i])
              R[i][j] = typeof dot === 'number' ? dot : 0

              for (let k = 0; k < m; k++) {
                v[k] -= R[i][j] * Q[i][k]
              }
            }

            R[j][j] = this.vectorLength(v)
            Q[j] = this.vectorNormalize(v)
          }

          // Convert Q to matrix form
          const Qmatrix: number[][] = []
          for (let i = 0; i < m; i++) {
            Qmatrix[i] = []
            for (let j = 0; j < n2; j++) {
              Qmatrix[i][j] = Q[j][i] || 0
            }
          }

          return {
            operation: 'QR decomposition',
            Q: Qmatrix.map(row => row.map(val => this.roundResult(val))),
            R: R.map(row => row.map(val => this.roundResult(val))),
            dimensions: `${m}x${n2}`,
          }

        case 'svd':
          // Simplified SVD demonstration (power iteration for largest singular value)
          const svdM = workMatrix.length
          const svdN = workMatrix[0]?.length || 0
          const minDim = Math.min(svdM, svdN)

          let u = new Array(svdM).fill(0).map(() => this.getRandom())
          let v = new Array(svdN).fill(0).map(() => this.getRandom())
          let sigma = 0

          // Power iteration
          for (let iter = 0; iter < 20; iter++) {
            // v = A^T u
            const newV: number[] = []
            for (let j = 0; j < svdN; j++) {
              let sum = 0
              for (let i = 0; i < svdM; i++) {
                sum += workMatrix[i][j] * u[i]
              }
              newV.push(sum)
            }

            const vNorm = this.vectorLength(newV)
            v = newV.map(val => val / vNorm)

            // u = A v
            const newU: number[] = []
            for (let i = 0; i < svdM; i++) {
              let sum = 0
              for (let j = 0; j < svdN; j++) {
                sum += workMatrix[i][j] * v[j]
              }
              newU.push(sum)
            }

            sigma = this.vectorLength(newU)
            u = newU.map(val => val / sigma)
          }

          return {
            operation: 'singular value decomposition (largest)',
            largestSingularValue: this.roundResult(sigma),
            leftVector: u.slice(0, 5).map(val => this.roundResult(val)),
            rightVector: v.slice(0, 5).map(val => this.roundResult(val)),
          }

        case 'cholesky':
          // Cholesky decomposition for positive definite matrices
          const chN = Math.min(workMatrix.length, workMatrix[0]?.length || 0)
          const chA: number[][] = []

          // Make symmetric positive definite matrix
          for (let i = 0; i < chN; i++) {
            chA[i] = []
            for (let j = 0; j < chN; j++) {
              if (i === j) {
                chA[i][j] = Math.abs(workMatrix[i][j]) + chN
              } else {
                chA[i][j] = (workMatrix[i][j] + workMatrix[j][i]) / 2
              }
            }
          }

          const chL: number[][] = Array(chN)
            .fill(null)
            .map(() => Array(chN).fill(0))

          for (let i = 0; i < chN; i++) {
            for (let j = 0; j <= i; j++) {
              let sum = 0

              if (i === j) {
                for (let k = 0; k < j; k++) {
                  sum += chL[j][k] * chL[j][k]
                }
                chL[j][j] = Math.sqrt(Math.max(0, chA[j][j] - sum))
              } else {
                for (let k = 0; k < j; k++) {
                  sum += chL[i][k] * chL[j][k]
                }
                chL[i][j] = (chA[i][j] - sum) / (chL[j][j] || 1)
              }
            }
          }

          return {
            operation: 'Cholesky decomposition',
            L: chL.map(row => row.map(val => this.roundResult(val))),
            size: chN,
            warning: 'input was modified to ensure positive definiteness',
            modifiedMatrix: chA.map(row => row.map(val => this.roundResult(val))),
          }

        case 'gram-schmidt':
          // Orthogonalize matrix columns
          const gsM = workMatrix.length
          const gsN = workMatrix[0]?.length || 0
          const orthogonal: number[][] = []

          for (let j = 0; j < gsN; j++) {
            let v: number[] = []
            for (let i = 0; i < gsM; i++) {
              v.push(workMatrix[i][j])
            }

            // Subtract projections onto previous vectors
            for (let k = 0; k < j; k++) {
              const dot = this.dotProduct(v, orthogonal[k])
              const norm = this.dotProduct(orthogonal[k], orthogonal[k])

              if (typeof dot === 'number' && typeof norm === 'number' && norm !== 0) {
                const scalar = dot / norm
                for (let i = 0; i < gsM; i++) {
                  v[i] -= scalar * orthogonal[k][i]
                }
              }
            }

            orthogonal.push(this.vectorNormalize(v))
          }

          // Convert to matrix form
          const orthMatrix: number[][] = []
          for (let i = 0; i < gsM; i++) {
            orthMatrix[i] = []
            for (let j = 0; j < gsN; j++) {
              orthMatrix[i][j] = orthogonal[j][i] || 0
            }
          }

          return {
            operation: 'Gram-Schmidt orthogonalization',
            result: orthMatrix.map(row => row.map(val => this.roundResult(val))),
            dimensions: `${gsM}x${gsN}`,
            orthonormal: true,
          }
      }
    }
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
