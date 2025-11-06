import { Ripple } from '../utils/ripple'
import { Utils } from '../utils/utils'

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

  randomFunc(matrix: number[][], index?: number): { operation: string; result: number | string } {
    const operations = [
      'sumRow', 'sumCol', 'avgRow', 'avgCol', 'medianRow', 'medianCol',
      'minRow', 'maxRow', 'minCol', 'maxCol', 'productRow', 'productCol',
      'stdDevRow', 'stdDevCol', 'sinRow', 'cosRow', 'tanRow', 'sinCol', 
      'cosCol', 'tanCol', 'sqrtSumRow', 'sqrtSumCol', 'hypotRow', 'hypotCol',
      'varianceRow', 'varianceCol', 'percentileRow', 'percentileCol', 
      'harmonicMeanRow', 'harmonicMeanCol', 'rangeRow', 'rangeCol'
    ]
    
    const randomOp = operations[Math.floor(Math.random() * operations.length)]
    
    const isRowOp = randomOp.includes('Row')
    const maxIndex = isRowOp ? matrix.length : (matrix[0]?.length || 0)
    const targetIndex = index !== undefined ? index : Math.floor(Math.random() * maxIndex)
    
    let result: number | string = 0
    
    switch (randomOp) {
      case 'sumRow':
        result = this.sumRow(matrix, targetIndex)
        break
      case 'sumCol':
        result = this.sumCol(matrix, targetIndex)
        break
      case 'avgRow':
        result = this.avgRow(matrix, targetIndex)
        break
      case 'avgCol':
        result = this.avgCol(matrix, targetIndex)
        break
      case 'medianRow':
        result = this.medianRow(matrix, targetIndex)
        break
      case 'medianCol':
        result = this.medianCol(matrix, targetIndex)
        break
      case 'minRow':
        result = this.minRow(matrix, targetIndex)
        break
      case 'maxRow':
        result = this.maxRow(matrix, targetIndex)
        break
      case 'minCol':
        result = this.minCol(matrix, targetIndex)
        break
      case 'maxCol':
        result = this.maxCol(matrix, targetIndex)
        break
      case 'productRow':
        result = this.productRow(matrix, targetIndex)
        break
      case 'productCol':
        result = this.productCol(matrix, targetIndex)
        break
      case 'stdDevRow':
        result = this.stdDevRow(matrix, targetIndex)
        break
      case 'stdDevCol':
        result = this.stdDevCol(matrix, targetIndex)
        break
      case 'sinRow':
        result = this.sinRow(matrix, targetIndex)
        break
      case 'cosRow':
        result = this.cosRow(matrix, targetIndex)
        break
      case 'tanRow':
        result = this.tanRow(matrix, targetIndex)
        break
      case 'sinCol':
        result = this.sinCol(matrix, targetIndex)
        break
      case 'cosCol':
        result = this.cosCol(matrix, targetIndex)
        break
      case 'tanCol':
        result = this.tanCol(matrix, targetIndex)
        break
      case 'sqrtSumRow':
        result = this.sqrtSumRow(matrix, targetIndex)
        break
      case 'sqrtSumCol':
        result = this.sqrtSumCol(matrix, targetIndex)
        break
      case 'hypotRow':
        result = this.hypotRow(matrix, targetIndex)
        break
      case 'hypotCol':
        result = this.hypotCol(matrix, targetIndex)
        break
      case 'varianceRow':
        result = this.varianceRow(matrix, targetIndex)
        break
      case 'varianceCol':
        result = this.varianceCol(matrix, targetIndex)
        break
      case 'percentileRow':
        result = this.percentileRow(matrix, targetIndex, 75)
        break
      case 'percentileCol':
        result = this.percentileCol(matrix, targetIndex, 75)
        break
      case 'harmonicMeanRow':
        result = this.harmonicMeanRow(matrix, targetIndex)
        break
      case 'harmonicMeanCol':
        result = this.harmonicMeanCol(matrix, targetIndex)
        break
      case 'rangeRow':
        result = this.rangeRow(matrix, targetIndex)
        break
      case 'rangeCol':
        result = this.rangeCol(matrix, targetIndex)
        break
    }
    
    return { 
      operation: `${randomOp}(${targetIndex})`, 
      result 
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
    if (result === 0) return Math.abs(this.rangeRow(matrix, rowIndex) / 4)
    if (!isFinite(result)) return this.rangeRow(matrix, rowIndex)
    return result
  }

  private stdDevCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return this.varianceCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const avg = colValues.reduce((sum, val) => sum + val, 0) / colValues.length
    const variance = colValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / colValues.length
    const result = Math.sqrt(variance)
    if (result === 0) return Math.abs(this.rangeCol(matrix, colIndex) / 4)
    if (!isFinite(result)) return this.rangeCol(matrix, colIndex)
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
      return this.avgRow(matrix, rowIndex)
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
    if (rowIndex < 0 || rowIndex >= matrix.length || matrix[rowIndex].length === 0) return this.stdDevRow(matrix, Math.max(0, Math.min(rowIndex, matrix.length - 1)))
    const max = Math.max(...matrix[rowIndex])
    const min = Math.min(...matrix[rowIndex])
    const result = max - min
    if (result === 0) return Math.abs(this.stdDevRow(matrix, rowIndex))
    if (!isFinite(result)) return this.varianceRow(matrix, rowIndex)
    return result
  }

  private rangeCol(matrix: number[][], colIndex: number): number {
    if (matrix.length === 0 || colIndex < 0 || colIndex >= matrix[0].length) return this.stdDevCol(matrix, Math.max(0, Math.min(colIndex, matrix[0]?.length - 1 || 0)))
    const colValues = matrix.map(row => row[colIndex] || 0)
    const max = Math.max(...colValues)
    const min = Math.min(...colValues)
    const result = max - min
    if (result === 0) return Math.abs(this.stdDevCol(matrix, colIndex))
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
      
      if (result === 0) {
        // Return a different mathematical function when result is 0
        const alternatives = [
          'sqrt(9)',      // 3
          'pow(2, 3)',    // 8
          'sin(30 deg)',  // 0.5
          'cos(60 deg)',  // 0.5
          'tan(45 deg)',  // 1
          '2 + 3',        // 5
          '4 * 2',        // 8
          '10 / 2'        // 5
        ]
        const chosen = alternatives[Math.abs(expression.length) % alternatives.length]
        return this.evaluate(chosen)
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
}
