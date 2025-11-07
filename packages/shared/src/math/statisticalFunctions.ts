import { avg, corelation, extrema, harmonicMean, median, mode, percentile, range, stdDev, variance } from 'ts-stats'

export class StatisticalFunctions {
  private roundResult(value: number, decimals: number = 3): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }

  mean(data: number[]): number {
    if (data.length === 0) return 0
    return this.roundResult(data.reduce((sum, val) => sum + val, 0) / data.length)
  }

  median(data: number[]): number {
    if (data.length === 0) return 0
    const medianValue = median(data)
    return this.roundResult(typeof medianValue === 'number' ? medianValue : 0)
  }

  mode(data: number[]): number[] {
    if (data.length === 0) return []
    const modeValue = mode(data)
    return Array.isArray(modeValue) ? modeValue : []
  }

  variance(data: number[]): number {
    if (data.length === 0) return 0
    const varianceValue = variance(data)
    return this.roundResult(typeof varianceValue === 'number' ? varianceValue : 0)
  }

  stdDev(data: number[]): number {
    if (data.length === 0) return 0
    const stdDevValue = stdDev(data)
    return this.roundResult(typeof stdDevValue === 'number' ? stdDevValue : 0)
  }

  harmonicMean(data: number[]): number {
    if (data.length === 0) return 0
    const hmValue = harmonicMean(data)
    return this.roundResult(typeof hmValue === 'number' && hmValue !== null ? hmValue : 0)
  }

  geometricMean(data: number[]): number {
    if (data.length === 0) return 0
    const product = data.reduce((prod, val) => prod * Math.abs(val), 1)
    return this.roundResult(Math.pow(product, 1 / data.length))
  }

  range(data: number[]): number {
    if (data.length === 0) return 0
    const rangeValue = range(data)
    return this.roundResult(typeof rangeValue === 'number' ? rangeValue : 0)
  }

  percentile(data: number[], p: number): number {
    if (data.length === 0) return 0
    const percentileValue = percentile(data, p)
    return this.roundResult(typeof percentileValue === 'number' ? percentileValue : 0)
  }

  covariance(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0
    
    const meanX = this.mean(x)
    const meanY = this.mean(y)
    
    let sum = 0
    for (let i = 0; i < x.length; i++) {
      sum += (x[i] - meanX) * (y[i] - meanY)
    }
    
    return this.roundResult(sum / (x.length - 1))
  }

  correlation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0
    const correlationValue = corelation(x, y)
    return this.roundResult(typeof correlationValue === 'number' ? correlationValue : 0)
  }

  skewness(data: number[]): number {
    if (data.length < 3) return 0
    
    const n = data.length
    const mean = this.mean(data)
    const std = this.stdDev(data)
    
    if (std === 0) return 0
    
    let sum = 0
    for (const val of data) {
      sum += Math.pow((val - mean) / std, 3)
    }
    
    return this.roundResult(n * sum / ((n - 1) * (n - 2)))
  }

  kurtosis(data: number[]): number {
    if (data.length < 4) return 0
    
    const n = data.length
    const mean = this.mean(data)
    const std = this.stdDev(data)
    
    if (std === 0) return 0
    
    let sum = 0
    for (const val of data) {
      sum += Math.pow((val - mean) / std, 4)
    }
    
    const factor1 = n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))
    const factor2 = 3 * Math.pow(n - 1, 2) / ((n - 2) * (n - 3))
    
    return this.roundResult(factor1 * sum - factor2)
  }

  zScore(value: number, data: number[]): number {
    const mean = this.mean(data)
    const std = this.stdDev(data)
    
    if (std === 0) return 0
    
    return this.roundResult((value - mean) / std)
  }

  quartiles(data: number[]): { q1: number, q2: number, q3: number } {
    if (data.length === 0) {
      return { q1: 0, q2: 0, q3: 0 }
    }
    
    return {
      q1: this.percentile(data, 25),
      q2: this.percentile(data, 50),
      q3: this.percentile(data, 75)
    }
  }

  interquartileRange(data: number[]): number {
    const { q1, q3 } = this.quartiles(data)
    return this.roundResult(q3 - q1)
  }

  outliers(data: number[]): number[] {
    if (data.length === 0) return []
    
    const { q1, q3 } = this.quartiles(data)
    const iqr = q3 - q1
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr
    
    return data.filter(val => val < lowerBound || val > upperBound)
  }

  coefficientOfVariation(data: number[]): number {
    const mean = this.mean(data)
    const std = this.stdDev(data)
    
    if (mean === 0) return 0
    
    return this.roundResult(std / Math.abs(mean))
  }

  standardError(data: number[]): number {
    if (data.length === 0) return 0
    
    const std = this.stdDev(data)
    return this.roundResult(std / Math.sqrt(data.length))
  }

  confidenceInterval(data: number[], confidence: number = 0.95): { lower: number, upper: number } {
    const mean = this.mean(data)
    const se = this.standardError(data)
    const z = this.getZScore(confidence)
    const margin = z * se
    
    return {
      lower: this.roundResult(mean - margin),
      upper: this.roundResult(mean + margin)
    }
  }

  private getZScore(confidence: number): number {
    const zScores: { [key: number]: number } = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    }
    return zScores[confidence] || 1.96
  }
}