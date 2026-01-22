# Mathematical Function Generation System - TODO

## ✅ Completed

### Core System
- [x] Mathematical function generation with 201 expression templates
  - Level 1 (Simple): 63 templates
  - Level 2 (Moderate): 66 templates
  - Level 3+ (Complex): 72 templates
- [x] Template randomization with parameterized coefficients (48% uniqueness improvement)
- [x] Matrix reference helpers: `mr(spec)`, `mc(spec)`, `m(size, row, col)`
- [x] Ragged matrix support with `?? 0` fallback
- [x] Expression simplification using math.js
- [x] Shorthand notation system (verbose ↔ compact conversion)
- [x] CLI tool (`genFunction`) for generating and testing functions
- [x] Comprehensive test suite (308 tests passing)

### Mathematical Functions Integrated
- [x] Basic arithmetic: add, subtract, multiply, divide, pow, sqrt, cbrt, abs, mod, gcd, lcm
- [x] Trigonometric: sin, cos, tan, asin, acos, atan, atan2
- [x] Hyperbolic: sinh, cosh, tanh, asinh, acosh, atanh
- [x] Logarithmic: log, log10, log2, exp
- [x] Rounding: ceil, floor, round, fix, sign
- [x] Comparison: max, min, hypot
- [x] Special functions: gamma, factorial, combinations, permutations
- [x] Bitwise operations: bitAnd, bitOr, bitXor, leftShift, rightLogShift
- [x] Matrix operations: det, trace
- [x] Statistical functions (mathjs): mean, median, mode, variance, std
- [x] Unit conversions: temperature, length, mass, angle, volume

### Shorthand Functions (Proof-of-Concept)
**TimeSeries (2/12 integrated):**
- [x] `ts.ma` → `timeseries.movingAverage`
- [x] `ts.es` → `timeseries.exponentialSmoothing`

**Signal Processing (2/15 integrated):**
- [x] `sig.lp` → `signal.lowPassFilter`
- [x] `sig.f` → `signal.fft`

**Statistical Functions (3/23 integrated):**
- [x] `s.hm` → `stats.harmonicMean`
- [x] `s.gm` → `stats.geometricMean`
- [x] `s.cor` → `stats.correlation`

---

## 🚧 Remaining Work

### TimeSeries Functions (10 remaining)

**Not yet integrated:**
- [ ] `ts.ac` - `autocorrelation(data, lag)` - Measure correlation at different time lags
- [ ] `ts.diff` - `differencing(data, order)` - Remove trends by differencing
- [ ] `ts.sd` - `seasonalDecomposition(data, period)` - Decompose into trend/seasonal/residual
- [ ] `ts.slf` - `simpleLinearForecast(data, steps)` - Simple linear regression forecast
- [ ] `ts.hw` - `holtWinters(data, alpha, beta, gamma, period, steps)` - Triple exponential smoothing
- [ ] `ts.ta` - `trendAnalysis(data)` - Analyze trend direction and strength
- [ ] `ts.da` - `detectAnomaly(data, threshold)` - Detect anomalous data points
- [ ] `ts.cpd` - `changePointDetection(data, minSegmentLength)` - Detect change points in series

**Integration tasks:**
1. Add shorthand notation to `functionShorthand.ts`
2. Add expression templates to `grid.ts` (complexity 2 or 3)
3. Add evaluation logic in `evaluate()` function
4. Write comprehensive tests

### Signal Processing Functions (13 remaining)

**Not yet integrated:**
- [ ] `sig.ifft` - `ifft(real, imaginary)` - Inverse FFT
- [ ] `sig.ps` - `powerSpectrum(signal)` - Power spectrum from FFT
- [ ] `sig.hp` - `highPassFilter(signal, cutoffFreq, sampleRate)` - High-pass filter
- [ ] `sig.bp` - `bandPassFilter(signal, lowFreq, highFreq, sampleRate)` - Band-pass filter
- [ ] `sig.conv` - `convolution(signal1, signal2)` - Convolution of two signals
- [ ] `sig.xcorr` - `crossCorrelation(signal1, signal2)` - Cross-correlation
- [ ] `sig.win` - `windowFunction(type, length)` - Window functions (hamming, hanning, blackman)
- [ ] `sig.spec` - `spectrogram(signal, windowSize, overlap)` - Time-frequency analysis
- [ ] `sig.peak` - `peakDetection(signal, threshold)` - Find peaks in signal
- [ ] `sig.env` - `envelope(signal)` - Extract signal envelope

**Integration tasks:**
1. Add shorthand notation to `functionShorthand.ts`
2. Add expression templates to `grid.ts` (complexity 2 or 3)
3. Add evaluation logic in `evaluate()` function
4. Handle complex number results (FFT returns {real, imaginary})
5. Write comprehensive tests

### Statistical Functions (17 remaining)

**Functions not in mathjs (need integration):**
- [ ] `s.range` - `range(data)` - Max - min
- [ ] `s.pct` - `percentile(data, p)` - Calculate percentile
- [ ] `s.cov` - `covariance(x, y)` - Covariance between two datasets
- [ ] `s.skew` - `skewness(data)` - Measure of asymmetry
- [ ] `s.kurt` - `kurtosis(data)` - Measure of tail heaviness
- [ ] `s.zscore` - `zScore(value, data)` - Standard score
- [ ] `s.q` - `quartiles(data)` - Q1, Q2 (median), Q3
- [ ] `s.iqr` - `interquartileRange(data)` - IQR (Q3 - Q1)
- [ ] `s.out` - `outliers(data)` - Detect outliers using IQR method
- [ ] `s.cv` - `coefficientOfVariation(data)` - Normalized measure of dispersion
- [ ] `s.se` - `standardError(data)` - Standard error of the mean
- [ ] `s.ci` - `confidenceInterval(data, confidence)` - Confidence interval
- [ ] `s.ext` - `extrema(data)` - Min and max values

**Functions already in mathjs (consider if needed):**
- mathjs `mean`, `median`, `mode`, `variance`, `std` are already integrated
- These custom implementations provide identical functionality

**Integration tasks:**
1. Add shorthand notation to `functionShorthand.ts`
2. Add expression templates to `grid.ts` (complexity 2 or 3)
3. Add evaluation logic in `evaluate()` function
4. Write comprehensive tests

### Linear Algebra Functions

**Available in mathjs but not fully integrated:**
- [ ] `la.inv` - `inv(matrix)` - Matrix inverse
- [ ] `la.eig` - `eig(matrix)` - Eigenvalues and eigenvectors
- [ ] `la.norm` - `norm(vector)` - Vector norm
- [ ] `la.dot` - `dot(a, b)` - Dot product
- [ ] `la.cross` - `cross(a, b)` - Cross product
- [ ] `la.rank` - `rank(matrix)` - Matrix rank
- [ ] `la.transpose` - `transpose(matrix)` - Matrix transpose (or just `t`)

**Already integrated:**
- [x] `la.det` (or just `det`) - Determinant
- [x] `la.trace` (or just `trace`) - Trace

**Integration tasks:**
1. Decide on shorthand notation (la.* vs bare names)
2. Add templates for 2D matrix operations
3. Handle matrix results in evaluate()
4. Write comprehensive tests

---

## 📋 Integration Checklist

For each new function to integrate, follow these steps:

### 1. Add Shorthand Notation
**File:** `src/utils/functionShorthand.ts`

Add entries to `SHORTHAND_MAP`:
```typescript
// TimeSeries
'ts.ac': 'timeseries.autocorrelation',

// Signal Processing
'sig.bp': 'signal.bandPassFilter',

// Stats
's.range': 'stats.range',
```

### 2. Add Expression Templates
**File:** `src/grid/grid.ts`

Add to appropriate complexity level in `genFunction()`:
```typescript
// Level 2 (Moderate) or Level 3 (Complex)
{ expr: 'ts.ac(mr(1-3), 2)', name: 'timeseries,autocorrelation,matrix' },
{ expr: 'sig.bp(mc(odd), 0.1, 0.4)', name: 'signal,bandPassFilter,matrix' },
{ expr: 's.range(m(2))', name: 'stats,range,matrix' },
```

### 3. Add Evaluation Logic
**File:** `src/grid/grid.ts` - `evaluate()` function

Add case in the shorthand function switch statement:
```typescript
case 'ts.ac': {
  const lag = paramsStr ? parseInt(paramsStr.trim(), 10) : 1
  result = tsInstance.autocorrelation(data, lag)
  break
}
```

### 4. Add Tests
**File:** `src/grid/grid.test.ts`

Add test cases for new functions:
```typescript
it('should evaluate timeseries autocorrelation', () => {
  const grid = genGrid(5)
  const result = evaluate(grid, {
    expression: 'ts.ac(mr(1-3), 2)',
    xCell: { row: 0, col: 0 },
    yCell: { row: 0, col: 1 }
  })
  expect(typeof result).toBe('number')
})
```

### 5. Update Documentation
- Update function count in CLI help text
- Update README with new function examples
- Update this TODO.md to mark items complete

---

## 🎯 Priority Recommendations

### High Priority (Most Useful)
1. **Signal Processing:**
   - `sig.bp` (bandPassFilter) - mentioned in proof-of-concept but not integrated
   - `sig.ps` (powerSpectrum) - fundamental frequency analysis
   - `sig.hp` (highPassFilter) - complement to lowPassFilter

2. **Statistical Functions:**
   - `s.range`, `s.pct`, `s.q`, `s.iqr` - fundamental statistical measures
   - `s.cov` - pairs well with existing correlation
   - `s.out` - outlier detection is very useful

3. **TimeSeries:**
   - `ts.diff` - differencing is fundamental for time series
   - `ts.ta` - trend analysis provides actionable insights
   - `ts.da` - anomaly detection is high-value

### Medium Priority (Nice to Have)
- More advanced forecasting (Holt-Winters)
- Advanced signal processing (spectrogram, envelope)
- Linear algebra operations beyond det/trace

### Low Priority (Specialized Use Cases)
- Seasonal decomposition (requires longer series)
- Change point detection (specialized algorithm)
- Skewness/kurtosis (advanced statistics)

---

## 📊 Progress Summary

**Core System:** ✅ Complete (201 templates, all infrastructure in place)

**Function Integration:**
- **TimeSeries:** 2/12 functions (16.7%)
- **Signal Processing:** 2/15 functions (13.3%)
- **Statistical Functions:** 3/23 functions (13.0%)
- **Linear Algebra:** 2/9 functions (22.2%)

**Overall:** 9/59 specialized functions integrated (15.3%)

**Next Milestone:** Integrate high-priority functions to reach 50% coverage (30/59 functions)
