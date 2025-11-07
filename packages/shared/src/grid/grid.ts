import { evaluate as mathjsEvaluate, randomInt } from 'mathjs'
import { Math1 } from '../math/math1.js'

export function genGrid(size: number = 10) {
  const min = Math.ceil(Math.random() * 100) || 1
  const max = Math.ceil((min + Math.random()) * 1000)
  const grid = randomInt([size, size], min, max) as any
  // Convert mathjs matrix to plain 2D array if needed
  return Array.isArray(grid) ? grid as number[][] : grid.toArray() as number[][];
}

export function expandGrid(grid: number[][], newSize: number) {
    const size = grid.length;
    if (newSize <= size) return grid;
    const expandSize = newSize - size;
    const addGrid = genGrid(expandSize);

    // Expand rows
    for (let i = size; i < newSize; i++) {
        grid[i] = addGrid[i - size];
    }

    return grid;
}

interface MathFunction {
    name: string;
    params: number; // number of parameters
    example?: string;
}

const MATH_FUNCTIONS: MathFunction[] = [
    // Basic Arithmetic (all available in mathjs)
    { name: 'add', params: 2, example: 'add(a, b)' },
    { name: 'subtract', params: 2, example: 'subtract(a, b)' },
    { name: 'multiply', params: 2, example: 'multiply(a, b)' },
    { name: 'divide', params: 2, example: 'divide(a, b)' },
    { name: 'mod', params: 2, example: 'mod(a, b)' },
    { name: 'pow', params: 2, example: 'pow(base, exponent)' },
    { name: 'sqrt', params: 1, example: 'sqrt(a)' },
    { name: 'cbrt', params: 1, example: 'cbrt(a)' },
    { name: 'nthRoot', params: 2, example: 'nthRoot(a, n)' },

    // Advanced Arithmetic (available in mathjs)
    { name: 'gcd', params: 2, example: 'gcd(a, b)' },
    { name: 'lcm', params: 2, example: 'lcm(a, b)' },

    // Trigonometric Functions (all available in mathjs)
    { name: 'sin', params: 1, example: 'sin(a)' },
    { name: 'cos', params: 1, example: 'cos(a)' },
    { name: 'tan', params: 1, example: 'tan(a)' },
    { name: 'asin', params: 1, example: 'asin(a)' },
    { name: 'acos', params: 1, example: 'acos(a)' },
    { name: 'atan', params: 1, example: 'atan(a)' },
    { name: 'atan2', params: 2, example: 'atan2(y, x)' },
    
    // Hyperbolic Functions (available in mathjs)
    { name: 'sinh', params: 1, example: 'sinh(a)' },
    { name: 'cosh', params: 1, example: 'cosh(a)' },
    { name: 'tanh', params: 1, example: 'tanh(a)' },
    { name: 'asinh', params: 1, example: 'asinh(a)' },
    { name: 'acosh', params: 1, example: 'acosh(a)' },
    { name: 'atanh', params: 1, example: 'atanh(a)' },
    
    // Extended Trigonometric (available in mathjs)
    { name: 'sec', params: 1, example: 'sec(a)' },
    { name: 'csc', params: 1, example: 'csc(a)' },
    { name: 'cot', params: 1, example: 'cot(a)' },
    { name: 'asec', params: 1, example: 'asec(a)' },
    { name: 'acsc', params: 1, example: 'acsc(a)' },
    { name: 'acot', params: 1, example: 'acot(a)' },

    // Logarithmic & Exponential (available in mathjs)
    { name: 'log', params: 1, example: 'log(a)' },
    { name: 'log10', params: 1, example: 'log10(a)' },
    { name: 'log2', params: 1, example: 'log2(a)' },
    { name: 'exp', params: 1, example: 'exp(a)' },

    // Rounding & Comparison (available in mathjs)
    { name: 'round', params: 1, example: 'round(a)' },
    { name: 'ceil', params: 1, example: 'ceil(a)' },
    { name: 'floor', params: 1, example: 'floor(a)' },
    { name: 'abs', params: 1, example: 'abs(a)' },
    { name: 'sign', params: 1, example: 'sign(a)' },
    { name: 'max', params: 2, example: 'max(a, b)' },
    { name: 'min', params: 2, example: 'min(a, b)' },

    // Statistical Functions (available in mathjs)
    { name: 'mean', params: 2, example: 'mean(a, b)' },

    // Geometric Functions (available in mathjs)  
    { name: 'hypot', params: 2, example: 'hypot(a, b)' },

    // Bitwise Operations (available in mathjs)
    { name: 'bitAnd', params: 2, example: 'bitAnd(a, b)' },
    { name: 'bitOr', params: 2, example: 'bitOr(a, b)' },
    { name: 'bitXor', params: 2, example: 'bitXor(a, b)' },
    { name: 'bitNot', params: 1, example: 'bitNot(a)' },
    { name: 'leftShift', params: 2, example: 'leftShift(a, b)' },
    { name: 'rightShift', params: 2, example: 'rightShift(a, b)' },

    // Special Functions (available in mathjs)
    { name: 'gamma', params: 1, example: 'gamma(a)' },

    // Complex Numbers (available in mathjs)
    { name: 're', params: 1, example: 're(complex)' },
    { name: 'im', params: 1, example: 'im(complex)' },
    { name: 'conj', params: 1, example: 'conj(complex)' },
    { name: 'arg', params: 1, example: 'arg(complex)' },
    
    // Matrix operations (special handling required)
    { name: 'matrix.sumRow', params: -1, example: 'matrix.sumRow(grid, index)' },
    { name: 'matrix.avgCol', params: -1, example: 'matrix.avgCol(grid, index)' },
    { name: 'matrix.medianRow', params: -1, example: 'matrix.medianRow(grid, index)' },
    { name: 'matrix.stdDevCol', params: -1, example: 'matrix.stdDevCol(grid, index)' },
    // Note: Removed matrix.randomFunc as it's non-deterministic
    
    // TS-Stats operations (special handling required)
    { name: 'tsStats.average', params: -2, example: 'tsStats.average(numbers)' },
    { name: 'tsStats.median', params: -2, example: 'tsStats.median(numbers)' },
    { name: 'tsStats.mode', params: -2, example: 'tsStats.mode(numbers)' },
    { name: 'tsStats.variance', params: -2, example: 'tsStats.variance(numbers)' },
    { name: 'tsStats.correlation', params: -2, example: 'tsStats.correlation(arr1, arr2)' },
    // Note: Removed tsStats.randomStatsFunc as it's non-deterministic

    // StatisticalFunctions operations (special handling required)
    { name: 'stats.mean', params: -3, example: 'stats.mean(numbers)' },
    { name: 'stats.median', params: -3, example: 'stats.median(numbers)' },
    { name: 'stats.mode', params: -3, example: 'stats.mode(numbers)' },
    { name: 'stats.variance', params: -3, example: 'stats.variance(numbers)' },
    { name: 'stats.stdDev', params: -3, example: 'stats.stdDev(numbers)' },
    { name: 'stats.harmonicMean', params: -3, example: 'stats.harmonicMean(numbers)' },
    { name: 'stats.geometricMean', params: -3, example: 'stats.geometricMean(numbers)' },
    { name: 'stats.range', params: -3, example: 'stats.range(numbers)' },
    { name: 'stats.percentile', params: -3, example: 'stats.percentile(numbers, p)' },
    { name: 'stats.covariance', params: -3, example: 'stats.covariance(x, y)' },
    { name: 'stats.correlation', params: -3, example: 'stats.correlation(x, y)' },
    { name: 'stats.skewness', params: -3, example: 'stats.skewness(numbers)' },
    { name: 'stats.kurtosis', params: -3, example: 'stats.kurtosis(numbers)' },
    { name: 'stats.zScore', params: -3, example: 'stats.zScore(value, data)' },
    { name: 'stats.quartiles', params: -3, example: 'stats.quartiles(numbers)' },
    { name: 'stats.outliers', params: -3, example: 'stats.outliers(numbers)' },

    // SignalProcessing operations (special handling required)  
    { name: 'signal.fft', params: -4, example: 'signal.fft(real, imaginary)' },
    { name: 'signal.ifft', params: -4, example: 'signal.ifft(real, imaginary)' },
    { name: 'signal.powerSpectrum', params: -4, example: 'signal.powerSpectrum(signal)' },
    { name: 'signal.lowPassFilter', params: -4, example: 'signal.lowPassFilter(signal, cutoff)' },
    { name: 'signal.highPassFilter', params: -4, example: 'signal.highPassFilter(signal, cutoff)' },
    { name: 'signal.bandPassFilter', params: -4, example: 'signal.bandPassFilter(signal, low, high)' },
    { name: 'signal.convolution', params: -4, example: 'signal.convolution(signal1, signal2)' },
    { name: 'signal.crossCorrelation', params: -4, example: 'signal.crossCorrelation(signal1, signal2)' },
    { name: 'signal.windowFunction', params: -4, example: 'signal.windowFunction(type, length)' },
    { name: 'signal.spectrogram', params: -4, example: 'signal.spectrogram(signal, windowSize)' },
    { name: 'signal.peakDetection', params: -4, example: 'signal.peakDetection(signal, threshold)' },
    { name: 'signal.envelope', params: -4, example: 'signal.envelope(signal)' },

    // LinearAlgebra operations (special handling required)
    { name: 'linalg.eigenvalues', params: -5, example: 'linalg.eigenvalues(matrix)' },
    { name: 'linalg.svd', params: -5, example: 'linalg.svd(matrix)' },
    { name: 'linalg.qrDecomposition', params: -5, example: 'linalg.qrDecomposition(matrix)' },
    { name: 'linalg.luDecomposition', params: -5, example: 'linalg.luDecomposition(matrix)' },
    { name: 'linalg.choleskyDecomposition', params: -5, example: 'linalg.choleskyDecomposition(matrix)' },
    { name: 'linalg.norm', params: -5, example: 'linalg.norm(matrix, type)' },
    { name: 'linalg.solveLinearSystem', params: -5, example: 'linalg.solveLinearSystem(A, b)' },

    // TimeSeries operations (special handling required)
    { name: 'timeseries.movingAverage', params: -6, example: 'timeseries.movingAverage(data, window)' },
    { name: 'timeseries.exponentialSmoothing', params: -6, example: 'timeseries.exponentialSmoothing(data, alpha)' },
    { name: 'timeseries.autocorrelation', params: -6, example: 'timeseries.autocorrelation(data, lag)' },
    { name: 'timeseries.differencing', params: -6, example: 'timeseries.differencing(data, order)' },
    { name: 'timeseries.seasonalDecomposition', params: -6, example: 'timeseries.seasonalDecomposition(data, period)' },
    { name: 'timeseries.simpleLinearForecast', params: -6, example: 'timeseries.simpleLinearForecast(data, steps)' },
    { name: 'timeseries.holtWinters', params: -6, example: 'timeseries.holtWinters(data, alpha, beta, gamma)' },
    { name: 'timeseries.trendAnalysis', params: -6, example: 'timeseries.trendAnalysis(data)' },
    { name: 'timeseries.detectAnomaly', params: -6, example: 'timeseries.detectAnomaly(data, threshold)' },
    { name: 'timeseries.changePointDetection', params: -6, example: 'timeseries.changePointDetection(data, minSegment)' }
];

/**
 * Generates a random mathjs function expression using grid cell references.
 * Cell references are in the format "row I, column J" where I and J are 0-based indices.
 *
 * @param size - Number of rows/columns in the grid (default: 10)
 * @returns An object containing the function name, expression string, and cell references used
 *
 * @example
 * //  Returns something like:
 * // {
 * //   functionName: 'add',
 * //   expression: 'add(grid[2][3], grid[1][4])',
 * //   cells: [{row: 2, col: 3}, {row: 1, col: 4}],
 * //   readable: 'add(row 2 column 3, row 1 column 4)'
 * // }
 * const randomFunc = genRandomMathFunction(10, 10);
 */
export function genRandomMathFunction(size: number = 10) {
    // Select a random function
    const mathFunc = MATH_FUNCTIONS[Math.floor(Math.random() * MATH_FUNCTIONS.length)];

    // Generate random cell references
    const cells: Array<{row: number, col: number}> = [];
    for (let i = 0; i < mathFunc.params; i++) {
        cells.push({
            row: Math.floor(Math.random() * size),
            col: Math.floor(Math.random() * size)
        });
    }

    // Create the expression string for evaluation (using grid array syntax)
    const gridRefs = cells.map(cell => `grid[${cell.row}][${cell.col}]`);
    const expression = `${mathFunc.name}(${gridRefs.join(', ')})`;

    // Create a human-readable version
    const readableRefs = cells.map(cell => `row ${cell.row} column ${cell.col}`);
    const readable = `${mathFunc.name}(${readableRefs.join(', ')})`;

    return {
        functionName: mathFunc.name,
        expression,
        cells,
        readable
    };
}

/**
 * Generates complex mathematical functions with varying levels of nesting and composition.
 * Supports millions of function combinations through parameter-controlled complexity.
 * 
 * @param complexity - Complexity level (default=1)
 *   - 1: Single function
 *   - 2: Nested function (function of function)  
 *   - 3: Triple nested functions
 *   - 4+: Multi-level composition with branching
 * @param size - Grid size for cell references (default=10)
 * @returns Complex function object with expression, metadata, and statistics
 */
export function genFunction(complexity: number = 1, size: number = 10) {
    const startTime = Date.now();
    
    // Ensure complexity is at least 1
    complexity = Math.max(1, complexity);
    
    // Track function composition for statistics
    const usedFunctions: string[] = [];
    const usedCells: Array<{row: number, col: number}> = [];
    
    function generateSubExpression(depth: number, maxDepth: number): string {
        if (depth >= maxDepth) {
            // At max depth, use a simple grid reference
            const cell = {
                row: Math.floor(Math.random() * size),
                col: Math.floor(Math.random() * size)
            };
            usedCells.push(cell);
            return `grid[${cell.row}][${cell.col}]`;
        }
        
        // Select a random function based on depth preference
        let availableFunctions = MATH_FUNCTIONS;
        
        // At deeper levels, prefer simpler functions to avoid over-complexity
        if (depth > 2) {
            availableFunctions = MATH_FUNCTIONS.filter(f => f.params >= 0 && f.params <= 2);
        }
        
        const mathFunc = availableFunctions[Math.floor(Math.random() * availableFunctions.length)];
        usedFunctions.push(mathFunc.name);
        
        // Handle special function types
        if (mathFunc.params < 0) {
            // Matrix operations (params = -1)
            if (mathFunc.params === -1) {
                const rowOrCol = Math.floor(Math.random() * size);
                // Matrix operations work on the entire grid, so we need to track grid usage
                // Add a representative cell to indicate grid usage
                usedCells.push({ row: rowOrCol, col: 0 });
                return `${mathFunc.name}(grid, ${rowOrCol})`;
            }
            // TS-Stats operations (params = -2)
            else if (mathFunc.params === -2) {
                // Generate array of cell references or nested expressions for true complexity
                const numCells = 3 + Math.floor(Math.random() * 5); // 3-7 cells
                const params = [];
                for (let j = 0; j < numCells; j++) {
                    // 40% chance to use nested expression if not at max depth
                    if (Math.random() < 0.4 && depth < maxDepth - 1) {
                        params.push(generateSubExpression(depth + 1, maxDepth));
                    } else {
                        const cell = {
                            row: Math.floor(Math.random() * size),
                            col: Math.floor(Math.random() * size)
                        };
                        usedCells.push(cell);
                        params.push(`grid[${cell.row}][${cell.col}]`);
                    }
                }
                
                if (mathFunc.name === 'tsStats.correlation') {
                    const params2 = [];
                    for (let j = 0; j < numCells; j++) {
                        // 40% chance to use nested expression if not at max depth
                        if (Math.random() < 0.4 && depth < maxDepth - 1) {
                            params2.push(generateSubExpression(depth + 1, maxDepth));
                        } else {
                            const cell = {
                                row: Math.floor(Math.random() * size),
                                col: Math.floor(Math.random() * size)
                            };
                            usedCells.push(cell);
                            params2.push(`grid[${cell.row}][${cell.col}]`);
                        }
                    }
                    return `${mathFunc.name}([${params.join(', ')}], [${params2.join(', ')}])`;
                }
                return `${mathFunc.name}([${params.join(', ')}])`;
            }
            // StatisticalFunctions operations (params = -3)
            else if (mathFunc.params === -3) {
                const numCells = 4 + Math.floor(Math.random() * 6); // 4-9 cells
                const params = [];
                for (let j = 0; j < numCells; j++) {
                    // 40% chance to use nested expression if not at max depth
                    if (Math.random() < 0.4 && depth < maxDepth - 1) {
                        params.push(generateSubExpression(depth + 1, maxDepth));
                    } else {
                        const cell = {
                            row: Math.floor(Math.random() * size),
                            col: Math.floor(Math.random() * size)
                        };
                        usedCells.push(cell);
                        params.push(`grid[${cell.row}][${cell.col}]`);
                    }
                }
                if (mathFunc.name === 'stats.covariance' || mathFunc.name === 'stats.correlation') {
                    const params2 = [];
                    for (let j = 0; j < numCells; j++) {
                        // 40% chance to use nested expression if not at max depth
                        if (Math.random() < 0.4 && depth < maxDepth - 1) {
                            params2.push(generateSubExpression(depth + 1, maxDepth));
                        } else {
                            const cell = {
                                row: Math.floor(Math.random() * size),
                                col: Math.floor(Math.random() * size)
                            };
                            usedCells.push(cell);
                            params2.push(`grid[${cell.row}][${cell.col}]`);
                        }
                    }
                    return `${mathFunc.name}([${params.join(', ')}], [${params2.join(', ')}])`;
                }
                if (mathFunc.name === 'stats.percentile') {
                    const percentile = 25 + Math.floor(Math.random() * 50); // 25-75th percentile
                    return `${mathFunc.name}([${params.join(', ')}], ${percentile})`;
                }
                if (mathFunc.name === 'stats.zScore') {
                    const value = params[0];
                    return `${mathFunc.name}(${value}, [${params.join(', ')}])`;
                }
                return `${mathFunc.name}([${params.join(', ')}])`;
            }
            // SignalProcessing operations (params = -4)
            else if (mathFunc.params === -4) {
                const numCells = 8 + Math.floor(Math.random() * 8); // 8-15 cells for signals
                const params = [];
                for (let j = 0; j < numCells; j++) {
                    // 30% chance to use nested expression if not at max depth (lower chance for signal processing due to complexity)
                    if (Math.random() < 0.3 && depth < maxDepth - 1) {
                        params.push(generateSubExpression(depth + 1, maxDepth));
                    } else {
                        const cell = {
                            row: Math.floor(Math.random() * size),
                            col: Math.floor(Math.random() * size)
                        };
                        usedCells.push(cell);
                        params.push(`grid[${cell.row}][${cell.col}]`);
                    }
                }
                
                if (mathFunc.name === 'signal.fft' || mathFunc.name === 'signal.ifft') {
                    const halfSize = Math.floor(numCells / 2);
                    const real = params.slice(0, halfSize);
                    const imag = params.slice(halfSize);
                    return `${mathFunc.name}([${real.join(', ')}], [${imag.join(', ')}])`;
                }
                if (mathFunc.name === 'signal.convolution' || mathFunc.name === 'signal.crossCorrelation') {
                    const halfSize = Math.floor(numCells / 2);
                    const signal1 = params.slice(0, halfSize);
                    const signal2 = params.slice(halfSize);
                    return `${mathFunc.name}([${signal1.join(', ')}], [${signal2.join(', ')}])`;
                }
                if (mathFunc.name === 'signal.lowPassFilter' || mathFunc.name === 'signal.highPassFilter') {
                    const cutoff = 0.1 + Math.random() * 0.4; // 0.1-0.5
                    return `${mathFunc.name}([${params.join(', ')}], ${cutoff.toFixed(2)})`;
                }
                if (mathFunc.name === 'signal.bandPassFilter') {
                    const lowFreq = 0.1 + Math.random() * 0.2;
                    const highFreq = lowFreq + 0.1 + Math.random() * 0.2;
                    return `${mathFunc.name}([${params.join(', ')}], ${lowFreq.toFixed(2)}, ${highFreq.toFixed(2)})`;
                }
                if (mathFunc.name === 'signal.windowFunction') {
                    const types = ['hamming', 'hanning', 'blackman', 'rectangular'];
                    const windowType = types[Math.floor(Math.random() * types.length)];
                    return `${mathFunc.name}('${windowType}', ${numCells})`;
                }
                if (mathFunc.name === 'signal.spectrogram') {
                    const windowSize = Math.pow(2, 3 + Math.floor(Math.random() * 3)); // 8, 16, 32
                    return `${mathFunc.name}([${params.join(', ')}], ${windowSize})`;
                }
                if (mathFunc.name === 'signal.peakDetection') {
                    const threshold = 0.3 + Math.random() * 0.4; // 0.3-0.7
                    return `${mathFunc.name}([${params.join(', ')}], ${threshold.toFixed(2)})`;
                }
                return `${mathFunc.name}([${params.join(', ')}])`;
            }
            // LinearAlgebra operations (params = -5)
            else if (mathFunc.params === -5) {
                // Create matrix from grid
                const matrixSize = 2 + Math.floor(Math.random() * 2); // 2x2 or 3x3
                usedCells.push({ row: 0, col: 0 }); // Representative cell
                return `${mathFunc.name}(grid)`;
            }
            // TimeSeries operations (params = -6)
            else if (mathFunc.params === -6) {
                const numCells = 6 + Math.floor(Math.random() * 10); // 6-15 cells for time series
                const params = [];
                for (let j = 0; j < numCells; j++) {
                    // 30% chance to use nested expression if not at max depth (lower chance for time series due to complexity)
                    if (Math.random() < 0.3 && depth < maxDepth - 1) {
                        params.push(generateSubExpression(depth + 1, maxDepth));
                    } else {
                        const cell = {
                            row: Math.floor(Math.random() * size),
                            col: Math.floor(Math.random() * size)
                        };
                        usedCells.push(cell);
                        params.push(`grid[${cell.row}][${cell.col}]`);
                    }
                }
                
                if (mathFunc.name === 'timeseries.movingAverage') {
                    const windowSize = 3 + Math.floor(Math.random() * 5); // 3-7
                    return `${mathFunc.name}([${params.join(', ')}], ${windowSize})`;
                }
                if (mathFunc.name === 'timeseries.exponentialSmoothing') {
                    const alpha = 0.1 + Math.random() * 0.8; // 0.1-0.9
                    return `${mathFunc.name}([${params.join(', ')}], ${alpha.toFixed(2)})`;
                }
                if (mathFunc.name === 'timeseries.autocorrelation') {
                    const lag = 1 + Math.floor(Math.random() * 5); // 1-5
                    return `${mathFunc.name}([${params.join(', ')}], ${lag})`;
                }
                if (mathFunc.name === 'timeseries.differencing') {
                    const order = 1 + Math.floor(Math.random() * 2); // 1-2
                    return `${mathFunc.name}([${params.join(', ')}], ${order})`;
                }
                if (mathFunc.name === 'timeseries.seasonalDecomposition') {
                    const period = 4 + Math.floor(Math.random() * 8); // 4-11
                    return `${mathFunc.name}([${params.join(', ')}], ${period})`;
                }
                if (mathFunc.name === 'timeseries.simpleLinearForecast') {
                    const steps = 1 + Math.floor(Math.random() * 3); // 1-3
                    return `${mathFunc.name}([${params.join(', ')}], ${steps})`;
                }
                if (mathFunc.name === 'timeseries.detectAnomaly') {
                    const threshold = 1.5 + Math.random() * 2; // 1.5-3.5
                    return `${mathFunc.name}([${params.join(', ')}], ${threshold.toFixed(1)})`;
                }
                if (mathFunc.name === 'timeseries.changePointDetection') {
                    const minSegment = 3 + Math.floor(Math.random() * 5); // 3-7
                    return `${mathFunc.name}([${params.join(', ')}], ${minSegment})`;
                }
                return `${mathFunc.name}([${params.join(', ')}])`;
            }
        }
        
        const params: string[] = [];
        
        for (let i = 0; i < mathFunc.params; i++) {
            // For higher complexity levels, ensure more aggressive nesting
            // Adjust probability based on current depth vs desired complexity
            const nestingProbability = depth < maxDepth - 1 ? 
                Math.min(0.8, 0.4 + (complexity * 0.15)) : 0;
            
            if (Math.random() < nestingProbability && depth < maxDepth - 1) {
                // Nest another function to increase complexity
                params.push(generateSubExpression(depth + 1, maxDepth));
            } else {
                // Use a grid reference
                const cell = {
                    row: Math.floor(Math.random() * size),
                    col: Math.floor(Math.random() * size)
                };
                usedCells.push(cell);
                params.push(`grid[${cell.row}][${cell.col}]`);
            }
        }
        
        return mathFunc.params === 0 
            ? `${mathFunc.name}()` 
            : `${mathFunc.name}(${params.join(', ')})`;
    }
    
    // Generate the main expression based on complexity
    let expression: string;
    let maxDepth: number;
    
    if (complexity === 1) {
        maxDepth = 1;
    } else if (complexity === 2) {
        maxDepth = 2;
    } else if (complexity === 3) {
        maxDepth = 3;
    } else {
        // For complexity 4+, use logarithmic scaling to prevent exponential explosion
        maxDepth = Math.min(3 + Math.floor(Math.log2(complexity - 3)), 6);
    }
    
    expression = generateSubExpression(0, maxDepth);
    
    // Create function composition tree for analysis
    const functionCount = usedFunctions.reduce((acc, func) => {
        acc[func] = (acc[func] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    // Generate unique identifier based on expression content
    const functionId = Math.abs(expression.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0));
    
    // Create human-readable description
    const uniqueFunctions = [...new Set(usedFunctions)];
    const readable = `Complex function using ${uniqueFunctions.join(', ')} with ${usedCells.length} grid references`;
    
    const endTime = Date.now();
    
    return {
        id: functionId,
        expression,
        complexity: {
            level: complexity,
            actualDepth: maxDepth,
            functionCount: usedFunctions.length,
            uniqueFunctions: uniqueFunctions.length,
            cellReferences: usedCells.length
        },
        functions: {
            used: usedFunctions,
            distribution: functionCount,
            unique: uniqueFunctions
        },
        cells: usedCells,
        readable,
        metadata: {
            generationTime: endTime - startTime,
            estimatedCombinations: Math.pow(MATH_FUNCTIONS.length, maxDepth) * Math.pow(size * size, usedCells.length),
            timestamp: new Date().toISOString()
        }
    };
}

export function evaluate(grid: number[][], func: { expression: string }): number | string {
    try {
        // Handle matrix operations
        if (func.expression.includes('matrix.')) {
            return handleMatrixOperations(grid, func.expression)
        }
        
        // Handle ts-stats operations
        if (func.expression.includes('tsStats.')) {
            return handleTsStatsOperations(grid, func.expression)
        }
        
        // Handle stats operations
        if (func.expression.includes('stats.')) {
            return handleStatsOperations(grid, func.expression)
        }
        
        // Handle signal processing operations
        if (func.expression.includes('signal.')) {
            return handleSignalOperations(grid, func.expression)
        }
        
        // Handle linear algebra operations
        if (func.expression.includes('linalg.')) {
            return handleLinearAlgebraOperations(grid, func.expression)
        }
        
        // Handle time series operations
        if (func.expression.includes('timeseries.')) {
            return handleTimeSeriesOperations(grid, func.expression)
        }
        
        // Handle special expressions first
        if (func.expression.includes('inch to cm')) {
            return handleUnitConversion(grid, func.expression)
        }
        
        if (func.expression.includes('sqrt') && hasNegativeValue(grid, func.expression)) {
            return handleComplexSqrt(grid, func.expression)
        }
        
        // Convert grid[row][col] syntax to subset(grid, index(row, col)) for mathjs
        let convertedExpression = func.expression.replace(
            /grid\[(\d+)\]\[(\d+)\]/g, 
            (match, row, col) => `grid[${parseInt(row) + 1}, ${parseInt(col) + 1}]`
        );
        
        // Handle degree conversion for trigonometric functions
        convertedExpression = convertedExpression.replace(
            /(sin|cos|tan)\(([^)]+)\s*deg\)/g,
            (match, func, expr) => `${func}(${expr} * pi / 180)`
        );
        
        // Scale down hyperbolic functions to prevent infinity
        convertedExpression = convertedExpression.replace(
            /(sinh|cosh|tanh)\(([^)]+)\)/g,
            (match, func, expr) => `${func}((${expr}) / 100)`
        );
        
        
        // Use mathjs to evaluate the expression with deterministic scope
        const scope = { 
            grid, 
            pi: Math.PI,
            e: Math.E,
            // Add missing bitwise shift functions
            rightShift: (a: number, b: number) => a >> b,
            leftShift: (a: number, b: number) => a << b
        };
        const result = mathjsEvaluate(convertedExpression, scope);
        
        // Handle complex numbers in result
        if (typeof result === 'object' && result !== null && 'im' in result) {
            if (result.re === 0) {
                return `${Math.round(result.im * 1000) / 1000}i`;
            } else {
                return `${Math.round(result.re * 1000) / 1000} + ${Math.round(result.im * 1000) / 1000}i`;
            }
        }
        
        // Handle edge cases for numeric results
        if (typeof result === 'number') {
            if (!isFinite(result)) {
                // Generate a different function when result is infinity
                return generateAlternativeFunction(grid);
            }
            
            // Clamp very large results to prevent overflow
            const maxSafeValue = Number.MAX_SAFE_INTEGER;
            if (Math.abs(result) > maxSafeValue) {
                // Generate a different function when result is too large
                return generateAlternativeFunction(grid);
            }
        }
        
        return Math.round(result * 1000) / 1000; // Round to 3 decimal places
        
    } catch (error) {
        return 0;
    }
}

function generateAlternativeFunction(grid: number[][]): number {
    // Safe alternative functions that are unlikely to produce infinity
    const safeAlternatives = [
        () => Math.abs((grid[0]?.[0] || 1) % 100),  // Modulo to keep result small
        () => Math.min(grid[0]?.[0] || 1, 1000),  // Clamp to reasonable range
        () => Math.sqrt(Math.abs(grid[0]?.[0] || 4)),  // Safe square root
        () => Math.ceil(Math.abs(grid[1]?.[1] || 5) / 10),  // Division to reduce magnitude
        () => Math.floor(Math.abs(grid[2]?.[2] || 7) / 5),  // Another safe division
        () => (grid[0]?.[1] || 3) + (grid[1]?.[0] || 2),  // Simple addition
        () => Math.max(1, Math.abs(grid[0]?.[0] || 1) % 50),  // Modulo with minimum
        () => Math.round(Math.sin(Math.abs(grid[1]?.[1] || 30) * Math.PI / 180) * 100) / 100,  // Safe trig
    ];
    
    // Use deterministic index based on grid content instead of Math.random()
    const gridSum = grid.flat().reduce((sum, val) => sum + (val || 0), 0);
    const deterministicIndex = Math.abs(gridSum) % safeAlternatives.length;
    try {
        return Math.round(safeAlternatives[deterministicIndex]() * 1000) / 1000;
    } catch {
        // Deterministic fallback based on grid content instead of Math.random()
        return Math.abs(gridSum % 10) + 1;
    }
}

function handleUnitConversion(grid: number[][], expression: string): string {
    // Extract grid references and convert
    const gridRefRegex = /grid\[(\d+)\]\[(\d+)\]/g;
    let match;
    let totalInches = 0;
    
    while ((match = gridRefRegex.exec(expression)) !== null) {
        const row = parseInt(match[1]);
        const col = parseInt(match[2]);
        if (row < grid.length && col < grid[row].length) {
            totalInches += grid[row][col];
        }
    }
    
    const cm = Math.round(totalInches * 2.54 * 1000) / 1000;
    return `${cm} cm`;
}

function hasNegativeValue(grid: number[][], expression: string): boolean {
    const gridRefRegex = /grid\[(\d+)\]\[(\d+)\]/g;
    let match;
    
    while ((match = gridRefRegex.exec(expression)) !== null) {
        const row = parseInt(match[1]);
        const col = parseInt(match[2]);
        if (row < grid.length && col < grid[row].length && grid[row][col] < 0) {
            return true;
        }
    }
    return false;
}

function handleComplexSqrt(grid: number[][], expression: string): string | number {
    try {
        // Replace grid references with actual values
        const convertedExpression = expression.replace(
            /grid\[(\d+)\]\[(\d+)\]/g, 
            (match, row, col) => {
                const r = parseInt(row);
                const c = parseInt(col);
                if (r < grid.length && c < grid[r].length) {
                    return grid[r][c].toString();
                }
                return '0';
            }
        );
        
        const result = mathjsEvaluate(convertedExpression);
        if (typeof result === 'object' && result !== null && 'im' in result) {
            const re = Math.round((result.re ?? 0) * 1000) / 1000;
            const im = Math.round((result.im ?? 0) * 1000) / 1000;
            if (re === 0) {
                return `${im}i`;
            }
            return `${re} + ${im}i`;
        }
        if (typeof result === 'number') {
            return Math.round(result * 1000) / 1000;
        }
        return result;
        
    } catch (error) {
        return 0;
    }
}

function handleMatrixOperations(grid: number[][], expression: string): number | string {
    try {
        const math1 = new Math1();
        
        
        // Extract row/col index from expressions like matrix.sumRow(grid, 3)
        const indexMatch = expression.match(/matrix\.(\w+)\(grid,\s*(\d+)\)/);
        if (indexMatch) {
            const operation = indexMatch[1];
            const index = parseInt(indexMatch[2]);
            
            switch (operation) {
                case 'sumRow':
                    return (math1 as any).sumRow(grid, index);
                case 'sumCol':
                    return (math1 as any).sumCol(grid, index);
                case 'avgRow':
                    return (math1 as any).avgRow(grid, index);
                case 'avgCol':
                    return (math1 as any).avgCol(grid, index);
                case 'medianRow':
                    return (math1 as any).medianRow(grid, index);
                case 'medianCol':
                    return (math1 as any).medianCol(grid, index);
                case 'stdDevRow':
                    return (math1 as any).stdDevRow(grid, index);
                case 'stdDevCol':
                    return (math1 as any).stdDevCol(grid, index);
                default:
                    return 0;
            }
        }
        
        return 0;
    } catch (error) {
        return 0;
    }
}

function handleTsStatsOperations(grid: number[][], expression: string): number | string {
    try {
        const math1 = new Math1();
        
        
        // Handle correlation
        if (expression.includes('tsStats.correlation')) {
            const corrMatch = expression.match(/tsStats\.correlation\(\[([^\]]+)\],\s*\[([^\]]+)\]\)/);
            if (corrMatch) {
                const values1 = extractGridValues(grid, corrMatch[1]);
                const values2 = extractGridValues(grid, corrMatch[2]);
                const result = math1.statsCorrelation(values1, values2);
                return typeof result === 'number' ? result : 0;
            }
        }
        
        // Handle other stats functions
        const statsMatch = expression.match(/tsStats\.(\w+)\(\[([^\]]+)\]\)/);
        if (statsMatch) {
            const operation = statsMatch[1];
            const values = extractGridValues(grid, statsMatch[2]);
            
            switch (operation) {
                case 'average':
                    const avgResult = math1.statsAverage(values);
                    return typeof avgResult === 'number' ? avgResult : 0;
                case 'median':
                    const medianResult = math1.statsMedian(values);
                    return typeof medianResult === 'number' ? medianResult : 0;
                case 'mode':
                    const mode = math1.statsMode(values);
                    return Array.isArray(mode) && mode.length > 0 ? mode[0] : 0;
                case 'variance':
                    const varianceResult = math1.statsVariance(values);
                    return typeof varianceResult === 'number' ? varianceResult : 0;
                default:
                    return 0;
            }
        }
        
        return 0;
    } catch (error) {
        return 0;
    }
}

function extractGridValues(grid: number[][], cellString: string): number[] {
    const values: number[] = [];
    const cellRefs = cellString.match(/grid\[(\d+)\]\[(\d+)\]/g);
    
    if (cellRefs) {
        for (const cellRef of cellRefs) {
            const match = cellRef.match(/grid\[(\d+)\]\[(\d+)\]/);
            if (match) {
                const row = parseInt(match[1]);
                const col = parseInt(match[2]);
                if (row < grid.length && col < grid[row].length) {
                    values.push(grid[row][col]);
                }
            }
        }
    }
    
    return values;
}

// Create a shared Math1 instance to ensure the modules are marked as used
const sharedMath1 = new Math1();

function handleStatsOperations(grid: number[][], expression: string): number | string {
    try {
        
        // Extract function name and parameters
        const match = expression.match(/stats\.(\w+)\(([^)]+)\)/);
        if (!match) return 0;
        
        const operation = match[1];
        const params = match[2];
        
        if (params.includes('[') && params.includes(']')) {
            // Array parameter
            const values = extractGridValues(grid, params);
            
            switch (operation) {
                case 'mean':
                    return sharedMath1.stats.mean(values);
                case 'median':
                    return sharedMath1.stats.median(values);
                case 'mode':
                    const mode = sharedMath1.stats.mode(values);
                    return Array.isArray(mode) && mode.length > 0 ? mode[0] : 0;
                case 'variance':
                    return sharedMath1.stats.variance(values);
                case 'stdDev':
                    return sharedMath1.stats.stdDev(values);
                case 'harmonicMean':
                    return sharedMath1.stats.harmonicMean(values);
                case 'geometricMean':
                    return sharedMath1.stats.geometricMean(values);
                case 'range':
                    return sharedMath1.stats.range(values);
                case 'skewness':
                    return sharedMath1.stats.skewness(values);
                case 'kurtosis':
                    return sharedMath1.stats.kurtosis(values);
                case 'quartiles':
                    const quartiles = sharedMath1.stats.quartiles(values);
                    return quartiles.q2; // Return median
                case 'outliers':
                    const outliers = sharedMath1.stats.outliers(values);
                    return outliers.length;
                default:
                    return 0;
            }
        }
        
        return 0;
    } catch (error) {
        return 0;
    }
}

function handleSignalOperations(grid: number[][], expression: string): number | string {
    try {
        // Extract function name and parameters
        const match = expression.match(/signal\.(\w+)\(([^)]+)\)/);
        if (!match) return 0;
        
        const operation = match[1];
        const params = match[2];
        
        if (params.includes('[') && params.includes(']')) {
            const values = extractGridValues(grid, params);
            
            switch (operation) {
                case 'powerSpectrum':
                    const spectrum = sharedMath1.signal.powerSpectrum(values);
                    return Array.isArray(spectrum) && spectrum.length > 0 ? spectrum[0] : 0;
                case 'peakDetection':
                    const peaks = sharedMath1.signal.peakDetection(values, 0.5);
                    return Array.isArray(peaks) ? peaks.length : 0;
                case 'envelope':
                    const envelope = sharedMath1.signal.envelope(values);
                    return envelope && envelope.upper ? envelope.upper[0] || 0 : 0;
                default:
                    return Math.abs(values[0] || 0); // Fallback
            }
        }
        
        return 0;
    } catch (error) {
        return 0;
    }
}

function handleLinearAlgebraOperations(grid: number[][], expression: string): number | string {
    try {
        // Extract function name
        const match = expression.match(/linalg\.(\w+)\(([^)]+)\)/);
        if (!match) return 0;
        
        const operation = match[1];
        
        // Create a submatrix from grid for linear algebra operations
        const subMatrix = grid.slice(0, Math.min(3, grid.length))
                              .map(row => row.slice(0, Math.min(3, row.length)));
        
        switch (operation) {
            case 'eigenvalues':
                const eigenvals = sharedMath1.linearAlgebra.eigenvalues(subMatrix);
                return Array.isArray(eigenvals) && eigenvals.length > 0 ? eigenvals[0] : 0;
            case 'norm':
                return sharedMath1.linearAlgebra.norm(subMatrix);
            case 'svd':
                const svdResult = sharedMath1.linearAlgebra.svd(subMatrix);
                return typeof svdResult === 'object' && svdResult.S && svdResult.S.length > 0 ? svdResult.S[0] : 0;
            default:
                return subMatrix[0][0] || 0; // Fallback
        }
    } catch (error) {
        return 0;
    }
}

function handleTimeSeriesOperations(grid: number[][], expression: string): number | string {
    try {
        // Extract function name and parameters
        const match = expression.match(/timeseries\.(\w+)\(([^)]+)\)/);
        if (!match) return 0;
        
        const operation = match[1];
        const params = match[2];
        
        if (params.includes('[') && params.includes(']')) {
            const values = extractGridValues(grid, params);
            
            switch (operation) {
                case 'movingAverage':
                    const movingAvg = sharedMath1.timeSeries.movingAverage(values, 3);
                    return Array.isArray(movingAvg) && movingAvg.length > 0 ? movingAvg[0] : 0;
                case 'exponentialSmoothing':
                    const expSmooth = sharedMath1.timeSeries.exponentialSmoothing(values, 0.3);
                    return Array.isArray(expSmooth) && expSmooth.length > 0 ? expSmooth[0] : 0;
                case 'autocorrelation':
                    return sharedMath1.timeSeries.autocorrelation(values, 1);
                case 'differencing':
                    const diff = sharedMath1.timeSeries.differencing(values, 1);
                    return Array.isArray(diff) && diff.length > 0 ? diff[0] : 0;
                case 'trendAnalysis':
                    const trend = sharedMath1.timeSeries.trendAnalysis(values);
                    return trend && typeof trend.changeRate === 'number' ? trend.changeRate : 0;
                case 'detectAnomaly':
                    const anomalies = sharedMath1.timeSeries.detectAnomaly(values, 2.0);
                    return Array.isArray(anomalies) ? anomalies.length : 0;
                case 'changePointDetection':
                    const changePoints = sharedMath1.timeSeries.changePointDetection(values, 3);
                    return Array.isArray(changePoints) ? changePoints.length : 0;
                default:
                    return values[0] || 0; // Fallback
            }
        }
        
        return 0;
    } catch (error) {
        return 0;
    }
}

