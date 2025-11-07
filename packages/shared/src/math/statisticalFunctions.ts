
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
    const sorted = [...data].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    
    if (sorted.length % 2 === 0) {
      return this.roundResult((sorted[middle - 1] + sorted[middle]) / 2)
    } else {
      return this.roundResult(sorted[middle])
    }
  }

  mode(data: number[]): number[] {
    if (data.length === 0) return []
    
    const frequency: { [key: number]: number } = {}
    let maxFreq = 0
    
    for (const val of data) {
      frequency[val] = (frequency[val] || 0) + 1
      maxFreq = Math.max(maxFreq, frequency[val])
    }
    
    if (maxFreq === 1) return [] // No mode if all values appear once
    
    const modes: number[] = []
    for (const [val, freq] of Object.entries(frequency)) {
      if (freq === maxFreq) {
        modes.push(Number(val))
      }
    }
    
    return modes.sort((a, b) => a - b)
  }

  variance(data: number[]): number {
    if (data.length === 0) return 0
    const mean = this.mean(data)
    const sumSquaredDiffs = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0)
    return this.roundResult(sumSquaredDiffs / data.length)
  }

  stdDev(data: number[]): number {
    if (data.length === 0) return 0
    return this.roundResult(Math.sqrt(this.variance(data)))
  }

  harmonicMean(data: number[]): number {
    if (data.length === 0) return 0
    
    // Check for zero or negative values
    if (data.some(val => val <= 0)) return 0
    
    const reciprocalSum = data.reduce((sum, val) => sum + (1 / val), 0)
    return this.roundResult(data.length / reciprocalSum)
  }

  geometricMean(data: number[]): number {
    if (data.length === 0) return 0
    const product = data.reduce((prod, val) => prod * Math.abs(val), 1)
    return this.roundResult(Math.pow(product, 1 / data.length))
  }

  range(data: number[]): number {
    if (data.length === 0) return 0
    const { min, max } = this.extrema(data)
    return this.roundResult(max - min)
  }

  percentile(data: number[], p: number): number {
    if (data.length === 0) return 0
    if (p < 0 || p > 100) return 0
    
    const sorted = [...data].sort((a, b) => a - b)
    const index = (p / 100) * (sorted.length - 1)
    
    if (Number.isInteger(index)) {
      return this.roundResult(sorted[index])
    } else {
      const lower = Math.floor(index)
      const upper = Math.ceil(index)
      const weight = index - lower
      
      return this.roundResult(sorted[lower] * (1 - weight) + sorted[upper] * weight)
    }
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
    
    const meanX = this.mean(x)
    const meanY = this.mean(y)
    
    let numerator = 0
    let sumXSquared = 0
    let sumYSquared = 0
    
    for (let i = 0; i < x.length; i++) {
      const diffX = x[i] - meanX
      const diffY = y[i] - meanY
      numerator += diffX * diffY
      sumXSquared += diffX * diffX
      sumYSquared += diffY * diffY
    }
    
    const denominator = Math.sqrt(sumXSquared * sumYSquared)
    if (denominator === 0) return 0
    
    return this.roundResult(numerator / denominator)
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

  extrema(data: number[]): { min: number, max: number } {
    if (data.length === 0) {
      return { min: 0, max: 0 }
    }
    
    let min = data[0]
    let max = data[0]
    
    for (const val of data) {
      if (val < min) min = val
      if (val > max) max = val
    }
    
    return {
      min: this.roundResult(min),
      max: this.roundResult(max)
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