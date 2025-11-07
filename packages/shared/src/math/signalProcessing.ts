export class SignalProcessing {
  private roundResult(value: number, decimals: number = 3): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }

  fft(real: number[], imaginary?: number[]): { real: number[], imaginary: number[] } {
    const n = real.length
    if (n === 0) return { real: [], imaginary: [] }
    
    // Initialize imaginary part if not provided
    const imag = imaginary || new Array(n).fill(0)
    
    // Bit reversal
    const bits = Math.log2(n)
    if (bits !== Math.floor(bits)) {
      // Pad to next power of 2
      const nextPow2 = Math.pow(2, Math.ceil(bits))
      const realCopy = [...real]
      const imagCopy = [...imag]
      while (realCopy.length < nextPow2) {
        realCopy.push(0)
        imagCopy.push(0)
      }
      return this.fft(realCopy, imagCopy)
    }
    
    const N = real.length
    const outReal = [...real]
    const outImag = [...imag]
    
    // Bit reversal permutation
    for (let i = 0; i < N; i++) {
      let j = 0
      let x = i
      let y = N - 1
      while (y > 0) {
        j = (j << 1) | (x & 1)
        x >>= 1
        y >>= 1
      }
      if (j > i) {
        const tempReal = outReal[i]
        outReal[i] = outReal[j]
        outReal[j] = tempReal
        
        const tempImag = outImag[i]
        outImag[i] = outImag[j]
        outImag[j] = tempImag
      }
    }
    
    // Cooley-Tukey FFT
    for (let size = 2; size <= N; size *= 2) {
      const halfSize = size / 2
      const angleStep = -2 * Math.PI / size
      
      for (let start = 0; start < N; start += size) {
        for (let i = 0; i < halfSize; i++) {
          const angle = angleStep * i
          const cos = Math.cos(angle)
          const sin = Math.sin(angle)
          
          const evenIdx = start + i
          const oddIdx = start + i + halfSize
          
          const tempReal = cos * outReal[oddIdx] - sin * outImag[oddIdx]
          const tempImag = sin * outReal[oddIdx] + cos * outImag[oddIdx]
          
          outReal[oddIdx] = outReal[evenIdx] - tempReal
          outImag[oddIdx] = outImag[evenIdx] - tempImag
          
          outReal[evenIdx] += tempReal
          outImag[evenIdx] += tempImag
        }
      }
    }
    
    return {
      real: outReal.map(v => this.roundResult(v)),
      imaginary: outImag.map(v => this.roundResult(v))
    }
  }

  ifft(real: number[], imaginary: number[]): { real: number[], imaginary: number[] } {
    const n = real.length
    if (n === 0) return { real: [], imaginary: [] }
    
    // Conjugate the complex input
    const conjImag = imaginary.map(v => -v)
    
    // Forward FFT
    const result = this.fft(real, conjImag)
    
    // Conjugate the result and scale
    return {
      real: result.real.map(v => this.roundResult(v / n)),
      imaginary: result.imaginary.map(v => this.roundResult(-v / n))
    }
  }

  powerSpectrum(signal: number[]): number[] {
    const { real, imaginary } = this.fft(signal)
    
    return real.map((r, i) => {
      const power = r * r + imaginary[i] * imaginary[i]
      return this.roundResult(power)
    })
  }

  lowPassFilter(signal: number[], cutoffFreq: number, sampleRate: number = 1): number[] {
    if (signal.length === 0) return []
    
    const { real, imaginary } = this.fft(signal)
    const n = real.length
    const freqBin = sampleRate / n
    
    // Apply filter in frequency domain
    // FFT bins: 0 to n/2 are positive frequencies, n/2+1 to n-1 are negative frequencies
    for (let i = 0; i < n; i++) {
      const freqIndex = i <= n / 2 ? i : n - i
      const freq = freqIndex * freqBin
      if (freq > cutoffFreq) {
        real[i] = 0
        imaginary[i] = 0
      }
    }
    
    // Inverse FFT to get filtered signal
    const filtered = this.ifft(real, imaginary)
    return filtered.real
  }

  highPassFilter(signal: number[], cutoffFreq: number, sampleRate: number = 1): number[] {
    if (signal.length === 0) return []
    
    const { real, imaginary } = this.fft(signal)
    const n = real.length
    const freqBin = sampleRate / n
    
    // Apply filter in frequency domain
    // FFT bins: 0 to n/2 are positive frequencies, n/2+1 to n-1 are negative frequencies
    for (let i = 0; i < n; i++) {
      const freqIndex = i <= n / 2 ? i : n - i
      const freq = freqIndex * freqBin
      if (freq < cutoffFreq) {
        real[i] = 0
        imaginary[i] = 0
      }
    }
    
    // Inverse FFT to get filtered signal
    const filtered = this.ifft(real, imaginary)
    return filtered.real
  }

  bandPassFilter(signal: number[], lowFreq: number, highFreq: number, sampleRate: number = 1): number[] {
    if (signal.length === 0) return []
    
    const { real, imaginary } = this.fft(signal)
    const n = real.length
    const freqBin = sampleRate / n
    
    // Apply filter in frequency domain
    // FFT bins: 0 to n/2 are positive frequencies, n/2+1 to n-1 are negative frequencies
    for (let i = 0; i < n; i++) {
      const freqIndex = i <= n / 2 ? i : n - i
      const freq = freqIndex * freqBin
      if (freq < lowFreq || freq > highFreq) {
        real[i] = 0
        imaginary[i] = 0
      }
    }
    
    // Inverse FFT to get filtered signal
    const filtered = this.ifft(real, imaginary)
    return filtered.real
  }

  convolution(signal1: number[], signal2: number[]): number[] {
    if (signal1.length === 0 || signal2.length === 0) return []
    
    const n = signal1.length + signal2.length - 1
    const result: number[] = new Array(n).fill(0)
    
    for (let i = 0; i < signal1.length; i++) {
      for (let j = 0; j < signal2.length; j++) {
        result[i + j] += signal1[i] * signal2[j]
      }
    }
    
    return result.map(v => this.roundResult(v))
  }

  crossCorrelation(signal1: number[], signal2: number[]): number[] {
    if (signal1.length === 0 || signal2.length === 0) return []
    
    // Reverse second signal for cross-correlation
    const reversed = [...signal2].reverse()
    return this.convolution(signal1, reversed)
  }

  windowFunction(type: 'hamming' | 'hanning' | 'blackman' | 'rectangular', length: number): number[] {
    const window: number[] = []
    
    switch (type) {
      case 'hamming':
        for (let i = 0; i < length; i++) {
          window.push(0.54 - 0.46 * Math.cos(2 * Math.PI * i / (length - 1)))
        }
        break
        
      case 'hanning':
        for (let i = 0; i < length; i++) {
          window.push(0.5 * (1 - Math.cos(2 * Math.PI * i / (length - 1))))
        }
        break
        
      case 'blackman':
        for (let i = 0; i < length; i++) {
          const a0 = 0.42
          const a1 = 0.5
          const a2 = 0.08
          window.push(
            a0 - a1 * Math.cos(2 * Math.PI * i / (length - 1)) +
            a2 * Math.cos(4 * Math.PI * i / (length - 1))
          )
        }
        break
        
      case 'rectangular':
      default:
        for (let i = 0; i < length; i++) {
          window.push(1)
        }
        break
    }
    
    return window.map(v => this.roundResult(v))
  }

  spectrogram(signal: number[], windowSize: number = 256, overlap: number = 0.5): number[][] {
    if (signal.length < windowSize) return []
    
    const hopSize = Math.floor(windowSize * (1 - overlap))
    const window = this.windowFunction('hanning', windowSize)
    const spectrogram: number[][] = []
    
    for (let start = 0; start + windowSize <= signal.length; start += hopSize) {
      const segment = signal.slice(start, start + windowSize)
      const windowed = segment.map((val, i) => val * window[i])
      const spectrum = this.powerSpectrum(windowed)
      spectrogram.push(spectrum.slice(0, Math.floor(windowSize / 2) + 1))
    }
    
    return spectrogram
  }

  peakDetection(signal: number[], threshold: number = 0.5): number[] {
    if (signal.length < 3) return []
    
    const peaks: number[] = []
    const maxValue = Math.max(...signal)
    const minValue = Math.min(...signal)
    const range = maxValue - minValue
    const absThreshold = minValue + threshold * range
    
    for (let i = 1; i < signal.length - 1; i++) {
      if (signal[i] > signal[i - 1] && 
          signal[i] > signal[i + 1] && 
          signal[i] >= absThreshold) {
        peaks.push(i)
      }
    }
    
    return peaks
  }

  envelope(signal: number[]): { upper: number[], lower: number[] } {
    if (signal.length < 3) {
      return { upper: [...signal], lower: [...signal] }
    }
    
    const upper: number[] = []
    const lower: number[] = []
    
    // Find local maxima and minima
    const maxima: { index: number, value: number }[] = []
    const minima: { index: number, value: number }[] = []
    
    for (let i = 1; i < signal.length - 1; i++) {
      if (signal[i] > signal[i - 1] && signal[i] > signal[i + 1]) {
        maxima.push({ index: i, value: signal[i] })
      } else if (signal[i] < signal[i - 1] && signal[i] < signal[i + 1]) {
        minima.push({ index: i, value: signal[i] })
      }
    }
    
    // Add endpoints
    maxima.unshift({ index: 0, value: signal[0] })
    maxima.push({ index: signal.length - 1, value: signal[signal.length - 1] })
    minima.unshift({ index: 0, value: signal[0] })
    minima.push({ index: signal.length - 1, value: signal[signal.length - 1] })
    
    // Interpolate between extrema
    for (let i = 0; i < signal.length; i++) {
      const upperValue = this.interpolateExtrema(i, maxima)
      const lowerValue = this.interpolateExtrema(i, minima)
      
      upper.push(this.roundResult(upperValue))
      lower.push(this.roundResult(lowerValue))
    }
    
    return { upper, lower }
  }

  private interpolateExtrema(index: number, extrema: { index: number, value: number }[]): number {
    // Find surrounding extrema
    let left = extrema[0]
    let right = extrema[extrema.length - 1]
    
    for (let i = 0; i < extrema.length - 1; i++) {
      if (extrema[i].index <= index && extrema[i + 1].index >= index) {
        left = extrema[i]
        right = extrema[i + 1]
        break
      }
    }
    
    // Linear interpolation
    if (left.index === right.index) {
      return left.value
    }
    
    const ratio = (index - left.index) / (right.index - left.index)
    return left.value + ratio * (right.value - left.value)
  }
}