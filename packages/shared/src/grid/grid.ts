import {
  bitAnd,
  bitOr,
  bitXor,
  combinations,
  det,
  factorial,
  gamma,
  leftShift,
  evaluate as mathjsEvaluate,
  mean,
  median,
  mode,
  parse,
  permutations,
  randomInt,
  rightLogShift,
  simplify,
  std,
  transpose,
  variance,
} from 'mathjs'
import { toFullCompact } from '../utils/functionShorthand.js'

export function genGrid(size: number = 5) {
  const min = Math.ceil(Math.random() * 100) || 1
  const max = Math.ceil((min + Math.random()) * 1000)
  const grid = randomInt([size, size], min, max) as any
  // Convert mathjs matrix to plain 2D array if needed
  return Array.isArray(grid) ? (grid as number[][]) : (grid.toArray() as number[][])
}

export function expandGrid(grid: number[][], newSize: number) {
  const size = grid.length
  if (newSize <= size) return grid

  // Generate a full newSize x newSize grid
  const expandedGrid = genGrid(newSize)

  // Copy existing values into the top-left region
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      expandedGrid[i][j] = grid[i][j]
    }
  }

  return expandedGrid
}

export function getSubgrid(matrix: number[][], size: number): number[][] {
  const rows = matrix.length
  const cols = matrix[0]?.length || 0

  // Validate size
  if (size <= 0 || size > Math.min(rows, cols)) {
    throw new Error(`Size must be between 1 and ${Math.min(rows, cols)}`)
  }

  // Random starting position
  const startRow = Math.floor(Math.random() * rows)
  const startCol = Math.floor(Math.random() * cols)

  // Create subgrid with rotation (wrap around if necessary)
  const subgrid: number[][] = []

  for (let i = 0; i < size; i++) {
    const row: number[] = []
    for (let j = 0; j < size; j++) {
      // Use modulo to wrap around if we exceed boundaries
      const sourceRow = (startRow + i) % rows
      const sourceCol = (startCol + j) % cols
      row.push(matrix[sourceRow][sourceCol])
    }
    subgrid.push(row)
  }

  return subgrid
}

/**
 * Parse matrix reference specification
 * Examples: "1-4", "odd", "even", "1,3,5", "all"
 */
function parseMatrixSpec(spec: string, maxIndex: number): number[] {
  // Handle "all"
  if (spec === 'all') {
    return Array.from({ length: maxIndex }, (_, i) => i)
  }

  // Handle "odd" (1-indexed: 1, 3, 5, ... -> 0-indexed: 0, 2, 4, ...)
  if (spec === 'odd') {
    return Array.from({ length: maxIndex }, (_, i) => i).filter(i => i % 2 === 0)
  }

  // Handle "even" (1-indexed: 2, 4, 6, ... -> 0-indexed: 1, 3, 5, ...)
  if (spec === 'even') {
    return Array.from({ length: maxIndex }, (_, i) => i).filter(i => i % 2 === 1)
  }

  // Handle range "1-4" (convert from 1-indexed to 0-indexed)
  const rangeMatch = spec.match(/^(\d+)-(\d+)$/)
  if (rangeMatch) {
    const start = Math.max(0, parseInt(rangeMatch[1]) - 1)
    const end = Math.min(maxIndex - 1, parseInt(rangeMatch[2]) - 1)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  // Handle list "1,3,5" (convert from 1-indexed to 0-indexed)
  if (spec.includes(',')) {
    return spec
      .split(',')
      .map(s => parseInt(s.trim()) - 1)
      .filter(i => i >= 0 && i < maxIndex)
  }

  // Handle single index "3" (convert from 1-indexed to 0-indexed)
  const singleIndex = parseInt(spec) - 1
  if (!isNaN(singleIndex) && singleIndex >= 0 && singleIndex < maxIndex) {
    return [singleIndex]
  }

  return []
}

/**
 * Extract specified rows from a matrix
 * @param matrix - Input matrix
 * @param spec - Row specification (e.g., "1-4", "odd", "even", "1,3,5", "all")
 * @returns Array of selected rows
 */
export function getMatrixRows(matrix: number[][], spec: string): number[][] {
  const rowIndices = parseMatrixSpec(spec, matrix.length)
  return rowIndices.map(i => matrix[i])
}

/**
 * Extract specified columns from a matrix
 * @param matrix - Input matrix
 * @param spec - Column specification (e.g., "1-4", "odd", "even", "1,3,5", "all")
 * @returns Array of selected columns (as rows for easier processing)
 */
export function getMatrixCols(matrix: number[][], spec: string): number[][] {
  const cols = matrix[0]?.length || 0
  const colIndices = parseMatrixSpec(spec, cols)
  return colIndices.map(colIdx => matrix.map(row => row[colIdx]))
}

/**
 * Flatten a matrix to a 1D array for statistical operations
 */
export function flattenMatrix(matrix: number[][]): number[] {
  return matrix.flat()
}

/**
 * Generates mathematical expressions using x and y variables from grid.
 * Uses math.js simplify() and evaluate() for expression handling.
 *
 * @param complexity - Complexity level (default=random 1-3). Values below 1 are clamped to 1.
 *   - 1: Simple expression (44 templates: basic operations, single functions, special functions, bitwise ops, matrix stats)
 *   - 2: Moderate expression (43 templates: combinations of two operations, special functions, bitwise ops, matrix operations)
 *   - 3+: Complex expression (47 templates: nested operations, multiple functions, complex matrix combinations)
 * @param size - Grid size for cell references (default=random 5-10). Must be a positive integer >= 1.
 * @returns Function object with expression and metadata including unique ID, expressions, complexity info, and generation statistics
 */
export function genFunction(complexity?: number, size?: number) {
  const startTime = Date.now()

  const actualComplexity = complexity !== undefined ? complexity : Math.floor(Math.random() * 3) + 1

  // Validate size before processing
  if (size !== undefined) {
    if (!Number.isInteger(size) || size < 1) {
      throw new Error(`Grid size must be a positive integer, got: ${size}`)
    }
  }

  const actualSize = size !== undefined ? size : Math.floor(Math.random() * 6) + 5
  const finalComplexity = Math.max(1, actualComplexity)

  // Generate random grid cells for x and y
  const xCell = {
    row: Math.floor(Math.random() * actualSize),
    col: Math.floor(Math.random() * actualSize),
  }
  const yCell = {
    row: Math.floor(Math.random() * actualSize),
    col: Math.floor(Math.random() * actualSize),
  }

  // Generate expression based on complexity
  let expression: string
  let operations: string[] = []

  // Helper to get random coefficients for parameterization
  const randCoeff = () => Math.floor(Math.random() * 5) + 1 // 1-5
  const randSmallCoeff = () => Math.floor(Math.random() * 3) + 1 // 1-3
  const randPower = () => Math.floor(Math.random() * 4) + 2 // 2-5

  if (finalComplexity === 1) {
    // Simple: basic operations, single functions, simple unit conversions
    // Mix of fixed templates and generator functions for parameterization
    const ops = [
      { expr: 'x + y', name: 'add' },
      { expr: 'x - y', name: 'subtract' },
      { expr: 'x * y', name: 'multiply' },
      { expr: 'x / y', name: 'divide' },
      { expr: 'x^2', name: 'square' },
      { expr: 'x^3', name: 'cube' },
      { expr: 'sqrt(x)', name: 'sqrt' },
      { expr: 'cbrt(x)', name: 'cbrt' },
      // Parameterized templates - generate fresh expressions each time
      { expr: () => `${randCoeff()}*x + y`, name: 'multiply,add' },
      { expr: () => `x + ${randCoeff()}*y`, name: 'add,multiply' },
      { expr: () => `${randCoeff()}*x - y`, name: 'multiply,subtract' },
      { expr: () => `x - ${randCoeff()}*y`, name: 'subtract,multiply' },
      { expr: () => `${randCoeff()}*x + ${randCoeff()}*y`, name: 'multiply,add' },
      { expr: () => `${randCoeff()}*x - ${randCoeff()}*y`, name: 'multiply,subtract' },
      { expr: () => `x^${randPower()}`, name: 'pow' },
      { expr: () => `y^${randPower()}`, name: 'pow' },
      { expr: () => `${randCoeff()}*x`, name: 'multiply' },
      { expr: () => `${randCoeff()}*y`, name: 'multiply' },
      { expr: () => `x / ${randCoeff()}`, name: 'divide' },
      { expr: () => `y / ${randCoeff()}`, name: 'divide' },
      { expr: () => `(x + y) / ${randCoeff()}`, name: 'add,divide' },
      { expr: () => `(x - y) * ${randCoeff()}`, name: 'subtract,multiply' },
      { expr: () => `(x * y) / ${randCoeff()}`, name: 'multiply,divide' },
      { expr: 'abs(x - y)', name: 'abs,subtract' },
      { expr: 'ceil(x / y)', name: 'ceil,divide' },
      { expr: 'floor(x / y)', name: 'floor,divide' },
      { expr: 'round(x / y)', name: 'round,divide' },
      { expr: 'sign(x - y)', name: 'sign,subtract' },
      { expr: 'max(x, y)', name: 'max' },
      { expr: 'min(x, y)', name: 'min' },
      { expr: 'mod(x, y)', name: 'mod' },
      { expr: 'gcd(x, y)', name: 'gcd' },
      { expr: 'lcm(x, y)', name: 'lcm' },
      { expr: 'tan(x)', name: 'tan' },
      { expr: 'asin(x / y)', name: 'asin,divide' },
      { expr: 'acos(x / y)', name: 'acos,divide' },
      { expr: 'atan(x / y)', name: 'atan,divide' },
      { expr: 'sinh(x)', name: 'sinh' },
      { expr: 'cosh(x)', name: 'cosh' },
      { expr: 'tanh(x)', name: 'tanh' },
      { expr: '(x + y) inch to cm', name: 'add,unit_conversion' },
      { expr: '(x - y) kg to lb', name: 'subtract,unit_conversion' },
      { expr: '(x * y) deg to rad', name: 'multiply,unit_conversion' },
      { expr: '(x / y) m to ft', name: 'divide,unit_conversion' },
      { expr: '(x + y) degC to degF', name: 'add,unit_conversion' },
      { expr: '(x * y) inch to cm', name: 'multiply,unit_conversion' },
      { expr: '(x - y) deg to rad', name: 'subtract,unit_conversion' },
      { expr: 'abs(x) mm to inch', name: 'abs,unit_conversion' },
      { expr: 'sqrt(x) km to mile', name: 'sqrt,unit_conversion' },
      // Special functions
      { expr: 'factorial(floor(abs(x)))', name: 'factorial,floor,abs' },
      { expr: 'gamma(abs(x))', name: 'gamma,abs' },
      // Bitwise operations (need integers)
      { expr: 'bitAnd(floor(x), floor(y))', name: 'bitAnd,floor' },
      { expr: 'bitOr(floor(x), floor(y))', name: 'bitOr,floor' },
      { expr: 'bitXor(floor(x), floor(y))', name: 'bitXor,floor' },
      // Statistical functions on matrix
      { expr: 'mean(m)', name: 'mean,matrix' },
      { expr: 'std(mr(odd))', name: 'std,matrix_rows' },
      { expr: 'variance(mc(even))', name: 'variance,matrix_cols' },
      { expr: 'median(mr(1-3))', name: 'median,matrix_rows' },
    ]
    const selected = ops[Math.floor(Math.random() * ops.length)]
    // Handle both string expressions and generator functions
    expression = typeof selected.expr === 'function' ? selected.expr() : selected.expr
    operations = selected.name.split(',')
  } else if (finalComplexity === 2) {
    // Moderate: combinations of two operations or functions
    const ops = [
      { expr: 'x^2 + y', name: 'pow,add' },
      { expr: 'x^3 - y', name: 'pow,subtract' },
      { expr: '2*x + 3*y', name: 'multiply,add' },
      { expr: 'x*y + x', name: 'multiply,add' },
      // Parameterized templates for more diversity
      { expr: () => `x^${randPower()} + y`, name: 'pow,add' },
      { expr: () => `x^${randPower()} - y`, name: 'pow,subtract' },
      { expr: () => `${randCoeff()}*x + ${randCoeff()}*y`, name: 'multiply,add' },
      { expr: () => `${randCoeff()}*x - ${randCoeff()}*y`, name: 'multiply,subtract' },
      { expr: () => `x*y + ${randCoeff()}*x`, name: 'multiply,add' },
      { expr: () => `x*y - ${randCoeff()}*y`, name: 'multiply,subtract' },
      { expr: () => `x^${randPower()} + y^${randPower()}`, name: 'pow,add' },
      { expr: () => `x^${randPower()} - y^${randPower()}`, name: 'pow,subtract' },
      { expr: () => `sqrt(x) + ${randCoeff()}*y`, name: 'sqrt,multiply,add' },
      { expr: () => `${randCoeff()}*sqrt(x) + cbrt(y)`, name: 'sqrt,cbrt,multiply,add' },
      { expr: 'sin(x) + cos(y)', name: 'sin,cos,add' },
      { expr: 'tan(x) + sin(y)', name: 'tan,sin,add' },
      { expr: 'sinh(x) - cosh(y)', name: 'sinh,cosh,subtract' },
      { expr: 'x^2 - y^2', name: 'pow,subtract' },
      { expr: 'sqrt(x^2 + y^2)', name: 'sqrt,pow,add' },
      { expr: 'cbrt(x^3 + y^3)', name: 'cbrt,pow,add' },
      { expr: 'abs(x) + abs(y)', name: 'abs,add' },
      { expr: 'ceil(x) + floor(y)', name: 'ceil,floor,add' },
      { expr: 'max(x, y) + min(x, y)', name: 'max,min,add' },
      { expr: 'log10(x) + log10(y)', name: 'log10,add' },
      { expr: 'log2(x) - log2(y)', name: 'log2,subtract' },
      { expr: 'exp(x / y)', name: 'exp,divide' },
      { expr: 'atan2(x, y)', name: 'atan2' },
      { expr: 'hypot(x, y)', name: 'hypot' },
      { expr: 'pow(x, y)', name: 'pow' },
      { expr: 'log(x, y)', name: 'log' },
      { expr: 'asinh(x / y)', name: 'asinh,divide' },
      { expr: 'acosh(abs(x) + 1)', name: 'acosh,abs,add' },
      { expr: 'atanh(x / y)', name: 'atanh,divide' },
      { expr: 'fix(x / y)', name: 'fix,divide' },
      { expr: '(x^2 + y) inch to cm', name: 'pow,add,unit_conversion' },
      { expr: '(x * y) deg to rad', name: 'multiply,unit_conversion' },
      { expr: 'sqrt(x + y) m to ft', name: 'sqrt,add,unit_conversion' },
      { expr: '(x^2 - y) kg to lb', name: 'pow,subtract,unit_conversion' },
      { expr: '(x / y) degC to degF', name: 'divide,unit_conversion' },
      { expr: '(x*y + x) inch to cm', name: 'multiply,add,unit_conversion' },
      { expr: 'abs(x - y) mm to cm', name: 'abs,subtract,unit_conversion' },
      { expr: 'max(x, y) liter to gallon', name: 'max,unit_conversion' },
      // Special functions
      { expr: 'combinations(floor(abs(x)), floor(abs(y)))', name: 'combinations,floor,abs' },
      { expr: 'permutations(floor(abs(x)), floor(abs(y)))', name: 'permutations,floor,abs' },
      { expr: 'gamma(x) + gamma(y)', name: 'gamma,add' },
      // Bitwise operations
      { expr: 'leftShift(floor(x), floor(y))', name: 'leftShift,floor' },
      { expr: 'rightLogShift(floor(x), floor(y))', name: 'rightLogShift,floor' },
      { expr: 'bitAnd(floor(x^2), floor(y))', name: 'bitAnd,floor,pow' },
      { expr: 'bitOr(floor(x), floor(y^2))', name: 'bitOr,floor,pow' },
      // Statistical functions on matrix
      { expr: 'mean(mc(1-3)) + std(mc(2-4))', name: 'mean,std,matrix_cols,add' },
      { expr: 'variance(mr(odd)) + variance(mr(even))', name: 'variance,matrix_rows,add' },
      { expr: 'median(m) / max(m)', name: 'median,max,matrix,divide' },
      { expr: 'min(mr(all)) + max(mc(all))', name: 'min,max,matrix,add' },
    ]
    const selected = ops[Math.floor(Math.random() * ops.length)]
    // Handle both string expressions and generator functions
    expression = typeof selected.expr === 'function' ? selected.expr() : selected.expr
    operations = selected.name.split(',')
  } else {
    // Complex: nested operations, multiple functions, complex expressions
    const ops = [
      { expr: 'x^2 + x*y + y^2', name: 'pow,multiply,add' },
      { expr: 'x * y * -x / (x^2)', name: 'multiply,divide,pow' },
      { expr: '(x + y) * (x - y)', name: 'add,subtract,multiply' },
      { expr: 'sin(x*y) + cos(x/y)', name: 'sin,cos,multiply,divide,add' },
      { expr: 'x^3 - 3*x*y + y^3', name: 'pow,multiply,subtract,add' },
      // Parameterized templates for significantly more diversity
      { expr: () => `x^${randPower()} + ${randCoeff()}*x*y + y^${randPower()}`, name: 'pow,multiply,add' },
      { expr: () => `${randCoeff()}*x^${randPower()} - ${randCoeff()}*y^${randPower()}`, name: 'pow,multiply,subtract' },
      { expr: () => `(${randCoeff()}*x + y) * (x - ${randCoeff()}*y)`, name: 'add,subtract,multiply' },
      { expr: () => `x^${randPower()} / ${randCoeff()} + y^${randPower()} / ${randCoeff()}`, name: 'pow,divide,add' },
      { expr: () => `sqrt(x^${randPower()}) + cbrt(y^${randPower()})`, name: 'sqrt,cbrt,pow,add' },
      { expr: () => `(x + ${randCoeff()}*y) / (x - ${randCoeff()}*y)`, name: 'add,subtract,multiply,divide' },
      { expr: () => `abs(x^${randPower()} - y^${randPower()})`, name: 'abs,pow,subtract' },
      { expr: () => `max(x, y)^${randPower()} - min(x, y)^${randPower()}`, name: 'max,min,pow,subtract' },
      { expr: () => `${randCoeff()}*log(x) + ${randCoeff()}*exp(y)`, name: 'log,exp,multiply,add' },
      { expr: () => `sqrt(${randCoeff()}*x^2 + ${randCoeff()}*y^2)`, name: 'sqrt,pow,multiply,add' },
      { expr: 'log(x) + exp(y)', name: 'log,exp,add' },
      { expr: 'log10(x^2) + log2(y^2)', name: 'log10,log2,pow,add' },
      { expr: 'sqrt(abs(x)) + cbrt(abs(y))', name: 'sqrt,cbrt,abs,add' },
      { expr: 'sin(x)^2 + cos(x)^2', name: 'sin,cos,pow,add' },
      { expr: 'tan(x/y) + atan(y/x)', name: 'tan,atan,divide,add' },
      { expr: 'sinh(x) * cosh(y)', name: 'sinh,cosh,multiply' },
      { expr: 'asinh(x) + acosh(abs(y) + 1)', name: 'asinh,acosh,abs,add' },
      { expr: 'max(x^2, y^2) - min(x, y)', name: 'max,min,pow,subtract' },
      { expr: 'ceil(x/y) + floor(y/x)', name: 'ceil,floor,divide,add' },
      { expr: 'abs(x - y) / max(x, y)', name: 'abs,max,subtract,divide' },
      { expr: 'gcd(x, y) + lcm(x, y)', name: 'gcd,lcm,add' },
      { expr: 'mod(x^2, y) + mod(y^2, x)', name: 'mod,pow,add' },
      { expr: 'sign(x) * abs(y) + sign(y) * abs(x)', name: 'sign,abs,multiply,add' },
      { expr: 'hypot(x, y) + sqrt(x*y)', name: 'hypot,sqrt,multiply,add' },
      { expr: 'pow(abs(x), 1/3) + pow(abs(y), 1/2)', name: 'pow,abs,divide,add' },
      { expr: 'log(x^2 + y^2, 10)', name: 'log,pow,add' },
      { expr: 'exp(x/100) * exp(y/100)', name: 'exp,divide,multiply' },
      { expr: 'atan2(sin(x), cos(y))', name: 'atan2,sin,cos' },
      { expr: 'fix(x * y) / ceil(x + y)', name: 'fix,ceil,multiply,add,divide' },
      { expr: 'round(sqrt(x^2 + y^2))', name: 'round,sqrt,pow,add' },
      { expr: '(x^2 + y^2) inch to cm', name: 'pow,add,unit_conversion' },
      { expr: 'sqrt(x^2 + y^2) m to ft', name: 'sqrt,pow,add,unit_conversion' },
      { expr: '(x + y) deg to rad', name: 'add,unit_conversion' },
      { expr: '(x * y + x) kg to lb', name: 'multiply,add,unit_conversion' },
      { expr: 'abs(x^2 - y^2) mm to cm', name: 'abs,pow,subtract,unit_conversion' },
      { expr: 'max(x, y)^2 liter to gallon', name: 'max,pow,unit_conversion' },
      { expr: 'cbrt(x^3 + y^3) km to mile', name: 'cbrt,pow,add,unit_conversion' },
      { expr: '(x + y) degC to degF', name: 'add,unit_conversion' },
      // Special functions
      { expr: 'factorial(floor(abs(x))) + factorial(floor(abs(y)))', name: 'factorial,floor,abs,add' },
      { expr: 'combinations(floor(abs(x)+abs(y)), floor(abs(y)))', name: 'combinations,floor,abs,add' },
      { expr: 'permutations(floor(abs(x*y)), floor(abs(y)))', name: 'permutations,floor,abs,multiply' },
      { expr: 'gamma(abs(x)) * gamma(abs(y))', name: 'gamma,abs,multiply' },
      { expr: 'log(gamma(abs(x)))', name: 'log,gamma,abs' },
      // Bitwise operations
      { expr: 'bitXor(bitAnd(floor(x), floor(y)), floor(x+y))', name: 'bitXor,bitAnd,floor,add' },
      {
        expr: 'bitOr(leftShift(floor(x), 2), rightLogShift(floor(y), 2))',
        name: 'bitOr,leftShift,rightLogShift,floor',
      },
      { expr: 'bitAnd(floor(x^2 + y^2), floor(x*y))', name: 'bitAnd,floor,pow,multiply,add' },
      // Statistical & matrix operations
      { expr: 'sqrt(variance(m)) + mean(mr(1-3))', name: 'sqrt,variance,mean,matrix,add' },
      { expr: 'std(mc(odd)) / std(mc(even))', name: 'std,matrix_cols,divide' },
      { expr: 'median(mr(all)) * variance(mc(all))', name: 'median,variance,matrix,multiply' },
      { expr: 'abs(mean(m) - median(m))', name: 'abs,mean,median,matrix,subtract' },
      { expr: 'max(mr(1-2)) - min(mr(3-4))', name: 'max,min,matrix_rows,subtract' },
      { expr: 'log(std(m) + variance(m))', name: 'log,std,variance,matrix,add' },
    ]
    const selected = ops[Math.floor(Math.random() * ops.length)]
    // Handle both string expressions and generator functions
    expression = typeof selected.expr === 'function' ? selected.expr() : selected.expr
    operations = selected.name.split(',')
  }

  // Simplify the expression using math.js
  let simplifiedExpression: string
  let simplificationSucceeded = false
  let simplificationError: string | undefined
  try {
    const node = parse(expression)
    const simplified = simplify(node)
    simplifiedExpression = simplified.toString()
    simplificationSucceeded = true
  } catch (error) {
    simplifiedExpression = expression
    simplificationError = error instanceof Error ? error.message : String(error)
  }

  const endTime = Date.now()

  // Generate unique identifier
  const functionId = Math.abs(
    expression.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0)
      return a & a
    }, 0),
  )

  const uniqueFunctions = [...new Set(operations)]
  const readable = `Expression: ${expression} with x=grid[${xCell.row}][${xCell.col}], y=grid[${yCell.row}][${yCell.col}]`

  return {
    id: functionId,
    expression,
    compactExpression: simplifiedExpression,
    simplifiedExpression,
    xCell,
    yCell,
    complexity: {
      level: finalComplexity,
      actualDepth: 1,
      functionCount: operations.length,
      uniqueFunctions: uniqueFunctions.length,
      cellReferences: 2,
    },
    functions: {
      used: operations,
      distribution: operations.reduce(
        (acc, func) => {
          acc[func] = (acc[func] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
      unique: uniqueFunctions,
    },
    cells: [xCell, yCell],
    readable,
    metadata: {
      generationTime: endTime - startTime,
      estimatedCombinations: finalComplexity === 1 ? 44 : finalComplexity === 2 ? 43 : 47,
      timestamp: new Date().toISOString(),
      gridSize: actualSize,
      simplification: {
        succeeded: simplificationSucceeded,
        error: simplificationError,
      },
      spaceSavings: {
        original: expression.length,
        compact: simplifiedExpression.length,
        savedBytes: Math.max(0, expression.length - simplifiedExpression.length),
        savedPercentage:
          expression.length === 0
            ? 0
            : Math.max(0, ((expression.length - simplifiedExpression.length) / expression.length) * 100),
      },
    },
  }
}

export function evaluate(
  grid: number[][],
  func: { expression: string; xCell?: { row: number; col: number }; yCell?: { row: number; col: number } },
  options?: { strictBounds?: boolean },
): number | string {
  try {
    const gridRows = grid.length
    const gridCols = grid[0]?.length || 0

    // Get x and y values from grid
    let x: number, y: number

    if (func.xCell && func.yCell) {
      // Strict bounds checking if enabled
      if (options?.strictBounds) {
        if (func.xCell.row < 0 || func.xCell.row >= gridRows || func.xCell.col < 0 || func.xCell.col >= gridCols) {
          throw new Error(
            `xCell out of bounds: [${func.xCell.row}][${func.xCell.col}] for grid of size ${gridRows}x${gridCols}`,
          )
        }
        if (func.yCell.row < 0 || func.yCell.row >= gridRows || func.yCell.col < 0 || func.yCell.col >= gridCols) {
          throw new Error(
            `yCell out of bounds: [${func.yCell.row}][${func.yCell.col}] for grid of size ${gridRows}x${gridCols}`,
          )
        }
      }

      // Use specified cells
      x = grid[func.xCell.row]?.[func.xCell.col] ?? 0
      y = grid[func.yCell.row]?.[func.yCell.col] ?? 0
    } else {
      // Default to first two grid cells if not specified
      x = grid[0]?.[0] ?? 0
      y = grid[0]?.[1] ?? 0
    }

    // Parse and replace matrix references in expression
    let processedExpression = func.expression

    // Replace mr(spec) - matrix rows
    processedExpression = processedExpression.replace(/mr\(([^)]+)\)/g, (match, spec) => {
      const rows = getMatrixRows(grid, spec)
      const flattened = flattenMatrix(rows)
      return `[${flattened.join(',')}]`
    })

    // Replace mc(spec) - matrix columns
    processedExpression = processedExpression.replace(/mc\(([^)]+)\)/g, (match, spec) => {
      const cols = getMatrixCols(grid, spec)
      const flattened = flattenMatrix(cols)
      return `[${flattened.join(',')}]`
    })

    // Replace m - entire matrix (but not in unit conversions like "m to ft" or "cm", "mm", etc.)
    // Only match standalone 'm' that's used as a matrix reference
    processedExpression = processedExpression.replace(/\bm\b(?!\s*to)(?![a-zA-Z])/g, () => {
      const flattened = flattenMatrix(grid)
      return `[${flattened.join(',')}]`
    })

    // Common scope for all evaluations with safe wrappers for expensive operations
    // Save references to original functions to avoid recursion
    const factorialOriginal = factorial
    const combinationsOriginal = combinations
    const permutationsOriginal = permutations

    const scope = {
      x,
      y,
      pi: Math.PI,
      e: Math.E,
      // Wrap expensive operations with safety limits
      factorial: (n: number) => {
        const limited = Math.min(Math.max(0, Math.floor(n)), 170) // factorial(170) is near max safe number
        return factorialOriginal(limited)
      },
      combinations: (n: number, k: number) => {
        const nLimited = Math.min(Math.max(0, Math.floor(n)), 1000)
        const kLimited = Math.min(Math.max(0, Math.floor(k)), nLimited)
        if (kLimited > nLimited) return 0
        return combinationsOriginal(nLimited, kLimited)
      },
      permutations: (n: number, k?: number) => {
        const nLimited = Math.min(Math.max(0, Math.floor(n)), 1000)
        if (k === undefined) return factorialOriginal(nLimited)
        const kLimited = Math.min(Math.max(0, Math.floor(k)), nLimited)
        if (kLimited > nLimited) return 0
        return permutationsOriginal(nLimited, kLimited)
      },
    }

    const result = mathjsEvaluate(processedExpression, scope)

    // Handle unit conversion expressions (return formatted string)
    if (func.expression.includes('to')) {
      // Extract numeric value and unit for consistent rounding
      if (
        typeof result === 'object' &&
        result !== null &&
        'toNumber' in result &&
        typeof result.toNumber === 'function'
      ) {
        // mathjs Unit object - extract the target unit from the expression
        // Expression format: "... to <targetUnit>"
        const toMatch = func.expression.match(/to\s+(\w+)/)
        const targetUnit = toMatch ? toMatch[1] : null

        let numericValue: number
        if (targetUnit) {
          // Get the numeric value in the target unit
          numericValue = result.toNumber(targetUnit)
        } else {
          // Fallback: parse from toString() which gives the value in the converted unit
          const resultStr = result.toString()
          const numMatch = resultStr.match(/^([\d.\-+e]+)/)
          numericValue = numMatch ? parseFloat(numMatch[1]) : result.toNumber()
        }

        // Apply same validation as numeric results
        if (!isFinite(numericValue)) {
          return '0'
        }

        const maxSafeValue = Number.MAX_SAFE_INTEGER
        if (Math.abs(numericValue) > maxSafeValue) {
          return '0'
        }

        const roundedValue = Math.round(numericValue * 1000) / 1000

        // Get the unit string from toString()
        const unitStr = result.toString().replace(/[\d.\-+e]+\s*/, '')
        return `${roundedValue} ${unitStr}`.trim()
      }

      // Fallback for other unit types
      if (typeof result === 'number') {
        if (!isFinite(result)) {
          return 0
        }
        const maxSafeValue = Number.MAX_SAFE_INTEGER
        if (Math.abs(result) > maxSafeValue) {
          return 0
        }
        return Math.round(result * 1000) / 1000
      }

      return result
    }

    // Handle complex numbers in result
    if (typeof result === 'object' && result !== null && 'im' in result) {
      if (result.re === 0) {
        return `${Math.round(result.im * 1000) / 1000}i`
      } else {
        return `${Math.round(result.re * 1000) / 1000} + ${Math.round(result.im * 1000) / 1000}i`
      }
    }

    // Handle and validate numeric results
    if (typeof result === 'number') {
      if (!isFinite(result)) return 0
      if (Math.abs(result) > Number.MAX_SAFE_INTEGER) return 0
      return Math.round(result * 1000) / 1000 // Round to 3 decimal places
    }

    // Non-numeric results should have been handled earlier (complex, units);
    // if anything slips through, fall back safely:
    return 0
  } catch (error) {
    // Re-throw validation errors from strictBounds
    if (error instanceof Error && error.message.includes('out of bounds')) {
      throw error
    }
    return 0
  }
}
