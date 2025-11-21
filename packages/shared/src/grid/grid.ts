import { evaluate as mathjsEvaluate, parse, randomInt, simplify } from 'mathjs'
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
  const expandSize = newSize - size
  const addGrid = genGrid(expandSize)

  // Expand rows
  for (let i = size; i < newSize; i++) {
    grid[i] = addGrid[i - size]
  }

  return grid
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
 * Generates simple mathematical expressions using x and y variables from grid.
 * Uses math.js simplify() and evaluate() for expression handling.
 *
 * @param complexity - Complexity level (default=1)
 *   - 1: Simple expression (e.g., x + y)
 *   - 2: Moderate expression (e.g., x^2 + y)
 *   - 3+: Complex expression (e.g., x^2 + x*y + y^2)
 * @param size - Grid size for cell references (default=10)
 * @returns Function object with expression and metadata
 */
export function genFunction(complexity?: number, size?: number) {
  const startTime = Date.now()

  const actualComplexity = complexity !== undefined ? complexity : Math.floor(Math.random() * 3) + 1
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

  if (finalComplexity === 1) {
    // Simple: x + y, x - y, x * y, x / y, unit conversions with both variables
    const ops = [
      { expr: 'x + y', name: 'add' },
      { expr: 'x - y', name: 'subtract' },
      { expr: 'x * y', name: 'multiply' },
      { expr: 'x / y', name: 'divide' },
      { expr: 'x^2', name: 'square' },
      { expr: 'sqrt(x)', name: 'sqrt' },
      { expr: '(x + y) inch to cm', name: 'add,unit_conversion' },
      { expr: '(x - y) kg to lb', name: 'subtract,unit_conversion' },
      { expr: '(x * y) deg to rad', name: 'multiply,unit_conversion' },
      { expr: '(x / y) m to ft', name: 'divide,unit_conversion' },
      { expr: '(x + y) celsius to fahrenheit', name: 'add,unit_conversion' },
      { expr: '(x * y) inch to cm', name: 'multiply,unit_conversion' },
      { expr: '(x - y) deg to rad', name: 'subtract,unit_conversion' },
    ]
    const selected = ops[Math.floor(Math.random() * ops.length)]
    expression = selected.expr
    operations = selected.name.split(',')
  } else if (finalComplexity === 2) {
    // Moderate: x^2 + y, sin(x) + cos(y), unit conversions with both variables
    const ops = [
      { expr: 'x^2 + y', name: 'pow,add' },
      { expr: '2*x + 3*y', name: 'multiply,add' },
      { expr: 'x*y + x', name: 'multiply,add' },
      { expr: 'sin(x) + cos(y)', name: 'sin,cos,add' },
      { expr: 'x^2 - y^2', name: 'pow,subtract' },
      { expr: 'sqrt(x^2 + y^2)', name: 'sqrt,pow,add' },
      { expr: '(x^2 + y) inch to cm', name: 'pow,add,unit_conversion' },
      { expr: '(x * y) deg to rad', name: 'multiply,unit_conversion' },
      { expr: 'sqrt(x + y) m to ft', name: 'sqrt,add,unit_conversion' },
      { expr: '(x^2 - y) kg to lb', name: 'pow,subtract,unit_conversion' },
      { expr: '(x / y) celsius to fahrenheit', name: 'divide,unit_conversion' },
      { expr: '(x*y + x) inch to cm', name: 'multiply,add,unit_conversion' },
    ]
    const selected = ops[Math.floor(Math.random() * ops.length)]
    expression = selected.expr
    operations = selected.name.split(',')
  } else {
    // Complex: nested operations with unit conversions
    const ops = [
      { expr: 'x^2 + x*y + y^2', name: 'pow,multiply,add' },
      { expr: 'x * y * -x / (x^2)', name: 'multiply,divide,pow' },
      { expr: '(x + y) * (x - y)', name: 'add,subtract,multiply' },
      { expr: 'sin(x*y) + cos(x/y)', name: 'sin,cos,multiply,divide,add' },
      { expr: 'x^3 - 3*x*y + y^3', name: 'pow,multiply,subtract,add' },
      { expr: 'log(x) + exp(y)', name: 'log,exp,add' },
      { expr: '(x^2 + y^2) inch to cm', name: 'pow,add,unit_conversion' },
      { expr: 'sqrt(x^2 + y^2) m to ft', name: 'sqrt,pow,add,unit_conversion' },
      { expr: '(sin(x) + cos(y)) * 100 deg to rad', name: 'sin,cos,add,multiply,unit_conversion' },
      { expr: '(x * y + x) kg to lb', name: 'multiply,add,unit_conversion' },
    ]
    const selected = ops[Math.floor(Math.random() * ops.length)]
    expression = selected.expr
    operations = selected.name.split(',')
  }

  // Simplify the expression using math.js
  let simplifiedExpression: string
  try {
    const node = parse(expression)
    const simplified = simplify(node)
    simplifiedExpression = simplified.toString()
  } catch (error) {
    simplifiedExpression = expression
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
    compactExpression: expression,
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
      estimatedCombinations: 18 * finalComplexity,
      timestamp: new Date().toISOString(),
      spaceSavings: {
        original: expression.length,
        compact: simplifiedExpression.length,
        savedBytes: expression.length - simplifiedExpression.length,
        savedPercentage:
          expression.length === 0 ? 0 : ((expression.length - simplifiedExpression.length) / expression.length) * 100,
      },
    },
  }
}

export function evaluate(
  grid: number[][],
  func: { expression: string; xCell?: { row: number; col: number }; yCell?: { row: number; col: number } },
): number | string {
  try {
    // Get x and y values from grid
    let x: number, y: number

    if (func.xCell && func.yCell) {
      // Use specified cells
      x = grid[func.xCell.row]?.[func.xCell.col] ?? 0
      y = grid[func.yCell.row]?.[func.yCell.col] ?? 0
    } else {
      // Default to first two grid cells if not specified
      x = grid[0]?.[0] ?? 0
      y = grid[0]?.[1] ?? 0
    }

    // Handle unit conversion expressions
    if (func.expression.includes('to')) {
      // Example: "2 inch to cm"
      const result = mathjsEvaluate(func.expression.replace(/x/g, x.toString()).replace(/y/g, y.toString()))

      // Extract numeric value and unit for consistent rounding
      if (
        typeof result === 'object' &&
        result !== null &&
        'toNumber' in result &&
        typeof result.toNumber === 'function'
      ) {
        // mathjs Unit object - extract numeric value and round to 3 decimal places
        const numericValue = result.toNumber()
        const roundedValue = Math.round(numericValue * 1000) / 1000

        // Get the unit string
        const unitStr = result.toString().replace(/[\d.\-+e]+\s*/, '')
        return `${roundedValue} ${unitStr}`.trim()
      }

      // Fallback for other types
      if (typeof result === 'number') {
        return Math.round(result * 1000) / 1000
      }

      return result
    }

    // Evaluate expression with x and y values using math.js
    const scope = {
      x,
      y,
      pi: Math.PI,
      e: Math.E,
    }

    const result = mathjsEvaluate(func.expression, scope)

    // Handle complex numbers in result
    if (typeof result === 'object' && result !== null && 'im' in result) {
      if (result.re === 0) {
        return `${Math.round(result.im * 1000) / 1000}i`
      } else {
        return `${Math.round(result.re * 1000) / 1000} + ${Math.round(result.im * 1000) / 1000}i`
      }
    }

    // Handle edge cases for numeric results
    if (typeof result === 'number') {
      if (!isFinite(result)) {
        return 0
      }

      // Clamp very large results to prevent overflow
      const maxSafeValue = Number.MAX_SAFE_INTEGER
      if (Math.abs(result) > maxSafeValue) {
        return 0
      }
    }

    return Math.round(result * 1000) / 1000 // Round to 3 decimal places
  } catch (error) {
    return 0
  }
}
