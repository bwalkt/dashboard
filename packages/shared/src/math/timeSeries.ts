export class TimeSeries {
  private roundResult(value: number, decimals: number = 3): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }

  movingAverage(data: number[], windowSize: number): number[] {
    if (data.length === 0 || windowSize <= 0 || windowSize > data.length) {
      return []
    }
    
    const result: number[] = []
    for (let i = windowSize - 1; i < data.length; i++) {
      let sum = 0
      for (let j = 0; j < windowSize; j++) {
        sum += data[i - j]
      }
      result.push(this.roundResult(sum / windowSize))
    }
    return result
  }

  exponentialSmoothing(data: number[], alpha: number = 0.3): number[] {
    if (data.length === 0) return []
    
    const result: number[] = [data[0]]
    for (let i = 1; i < data.length; i++) {
      const smoothedValue = alpha * data[i] + (1 - alpha) * result[i - 1]
      result.push(this.roundResult(smoothedValue))
    }
    return result
  }

  autocorrelation(data: number[], lag: number): number {
    if (data.length <= lag || lag < 1) return 0
    
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length
    
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < data.length - lag; i++) {
      numerator += (data[i] - mean) * (data[i + lag] - mean)
    }
    
    for (let i = 0; i < data.length; i++) {
      denominator += Math.pow(data[i] - mean, 2)
    }
    
    if (denominator === 0) return 0
    
    return this.roundResult(numerator / denominator)
  }

  differencing(data: number[], order: number = 1): number[] {
    if (data.length <= order) return []
    
    let result = [...data]
    for (let i = 0; i < order; i++) {
      const diff: number[] = []
      for (let j = 1; j < result.length; j++) {
        diff.push(this.roundResult(result[j] - result[j - 1]))
      }
      result = diff
    }
    return result
  }

  seasonalDecomposition(data: number[], period: number): {
    trend: number[],
    seasonal: number[],
    residual: number[]
  } {
    if (data.length < period * 2) {
      return { trend: [], seasonal: [], residual: [] }
    }
    
    // Calculate trend using moving average
    const trend = this.movingAverage(data, period)
    
    // Calculate detrended series
    const detrended: number[] = []
    for (let i = Math.floor(period / 2); i < data.length - Math.floor(period / 2); i++) {
      const trendIndex = i - Math.floor(period / 2)
      detrended.push(data[i] - trend[trendIndex])
    }
    
    // Calculate seasonal component
    const seasonal: number[] = []
    for (let i = 0; i < period; i++) {
      let sum = 0
      let count = 0
      for (let j = i; j < detrended.length; j += period) {
        sum += detrended[j]
        count++
      }
      seasonal.push(this.roundResult(sum / count))
    }
    
    // Extend seasonal pattern to match data length
    const fullSeasonal: number[] = []
    for (let i = 0; i < data.length; i++) {
      fullSeasonal.push(seasonal[i % period])
    }
    
    // Calculate residuals
    const residual: number[] = []
    for (let i = 0; i < trend.length; i++) {
      const dataIndex = i + Math.floor(period / 2)
      residual.push(this.roundResult(data[dataIndex] - trend[i] - fullSeasonal[dataIndex]))
    }
    
    return { trend, seasonal: fullSeasonal, residual }
  }

  simpleLinearForecast(data: number[], steps: number = 1): number[] {
    if (data.length < 2) return []
    
    // Calculate linear regression
    const n = data.length
    const x = Array.from({ length: n }, (_, i) => i)
    
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = data.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * data[i], 0)
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    const forecast: number[] = []
    for (let i = 0; i < steps; i++) {
      const nextX = n + i
      forecast.push(this.roundResult(slope * nextX + intercept))
    }
    
    return forecast
  }

  holtWinters(data: number[], alpha: number = 0.3, beta: number = 0.1, gamma: number = 0.1, period: number = 12, steps: number = 1): number[] {
    if (data.length < period * 2) return this.simpleLinearForecast(data, steps)
    
    // Guard against zero values that would cause division by zero
    const hasZeroValues = data.slice(0, period).some(val => val === 0)
    if (hasZeroValues) return this.simpleLinearForecast(data, steps)
    
    // Initialize
    const level: number[] = [data[0]]
    const trend: number[] = [(data[period] - data[0]) / period]
    const seasonal: number[] = data.slice(0, period).map(val => val / data[0])
    
    // Fit model
    for (let i = period; i < data.length; i++) {
      const prevLevel = level[level.length - 1]
      const prevTrend = trend[trend.length - 1]
      const prevSeasonal = seasonal[i % period]
      
      // Guard against zero seasonal component
      if (prevSeasonal === 0) return this.simpleLinearForecast(data, steps)
      
      const newLevel = alpha * (data[i] / prevSeasonal) + (1 - alpha) * (prevLevel + prevTrend)
      
      // Guard against zero level
      if (newLevel === 0) return this.simpleLinearForecast(data, steps)
      
      const newTrend = beta * (newLevel - prevLevel) + (1 - beta) * prevTrend
      const newSeasonal = gamma * (data[i] / newLevel) + (1 - gamma) * prevSeasonal
      
      level.push(newLevel)
      trend.push(newTrend)
      seasonal[i % period] = newSeasonal
    }
    
    // Forecast
    const forecast: number[] = []
    const lastLevel = level[level.length - 1]
    const lastTrend = trend[trend.length - 1]
    
    for (let i = 0; i < steps; i++) {
      const seasonalIndex = (data.length + i) % period
      const forecastValue = (lastLevel + lastTrend * (i + 1)) * seasonal[seasonalIndex]
      forecast.push(this.roundResult(forecastValue))
    }
    
    return forecast
  }

  trendAnalysis(data: number[]): {
    direction: 'increasing' | 'decreasing' | 'stable',
    strength: number,
    changeRate: number
  } {
    if (data.length < 2) {
      return { direction: 'stable', strength: 0, changeRate: 0 }
    }
    
    // Calculate linear regression slope
    const n = data.length
    const x = Array.from({ length: n }, (_, i) => i)
    
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = data.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * data[i], 0)
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    
    // Calculate R-squared for strength
    const meanY = sumY / n
    const ssTotal = data.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0)
    const predicted = x.map(xi => slope * xi + (sumY - slope * sumX) / n)
    const ssResidual = data.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0)
    const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal
    
    return {
      direction: slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable',
      strength: this.roundResult(Math.abs(rSquared)),
      changeRate: this.roundResult(slope)
    }
  }

  detectAnomaly(data: number[], threshold: number = 2.5): number[] {
    if (data.length < 3) return []
    
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
    const std = Math.sqrt(variance)
    
    const anomalies: number[] = []
    data.forEach((val, index) => {
      if (Math.abs(val - mean) > threshold * std) {
        anomalies.push(index)
      }
    })
    
    return anomalies
  }

  changePointDetection(data: number[], minSegmentLength: number = 5): number[] {
    if (data.length < minSegmentLength * 2) return []
    
    const changePoints: number[] = []
    
    for (let i = minSegmentLength; i < data.length - minSegmentLength; i++) {
      const leftSegment = data.slice(i - minSegmentLength, i)
      const rightSegment = data.slice(i, i + minSegmentLength)
      
      const leftMean = leftSegment.reduce((sum, val) => sum + val, 0) / leftSegment.length
      const rightMean = rightSegment.reduce((sum, val) => sum + val, 0) / rightSegment.length
      
      const leftVar = leftSegment.reduce((sum, val) => sum + Math.pow(val - leftMean, 2), 0) / leftSegment.length
      const rightVar = rightSegment.reduce((sum, val) => sum + Math.pow(val - rightMean, 2), 0) / rightSegment.length
      
      const pooledStd = Math.sqrt((leftVar + rightVar) / 2)
      
      // Skip if both segments have zero variance
      if (pooledStd === 0) continue
      
      const tStatistic = Math.abs(leftMean - rightMean) / (pooledStd * Math.sqrt(2 / minSegmentLength))
      
      if (tStatistic > 2.5) {
        changePoints.push(i)
      }
    }
    
    return changePoints
  }
}