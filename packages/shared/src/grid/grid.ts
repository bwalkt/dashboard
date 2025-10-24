import { evaluate as mathjsEvaluate, randomInt } from 'mathjs'

export function genGrid(size: number = 10) {
  const min = Math.ceil(Math.random() * 100) || 1
  const max = Math.ceil((min + Math.random()) * 1000)
  const grid = randomInt([size, size], min, max)
  return grid;
}

export function expandGrid(grid: number[][], newSize: number) {
    const size = grid.length;
    if (newSize <= size) return grid;
    const expandSize = newSize - size;
    const addGrid = genGrid(expandSize);

    // Expand rows
    for (let i = size; i < newSize; i++) {
        // @ts-ignore
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
    // Arithmetic
    { name: 'add', params: 2, example: 'add(a, b)' },
    { name: 'subtract', params: 2, example: 'subtract(a, b)' },
    { name: 'multiply', params: 2, example: 'multiply(a, b)' },
    { name: 'divide', params: 2, example: 'divide(a, b)' },

    // Trigonometric
    { name: 'sin', params: 1, example: 'sin(a)' },
    { name: 'cos', params: 1, example: 'cos(a)' },
    { name: 'tan', params: 1, example: 'tan(a)' },
    { name: 'atan2', params: 2, example: 'atan2(y, x)' },

    // Power and roots
    { name: 'pow', params: 2, example: 'pow(base, exponent)' },
    { name: 'sqrt', params: 1, example: 'sqrt(a)' },
    { name: 'log', params: 1, example: 'log(a)' },
    { name: 'log10', params: 1, example: 'log10(a)' },

    // Rounding
    { name: 'round', params: 1, example: 'round(a)' },
    { name: 'ceil', params: 1, example: 'ceil(a)' },
    { name: 'floor', params: 1, example: 'floor(a)' },
    { name: 'abs', params: 1, example: 'abs(a)' },

    // Statistical
    { name: 'max', params: 2, example: 'max(a, b)' },
    { name: 'min', params: 2, example: 'min(a, b)' },
    { name: 'mean', params: 2, example: 'mean(a, b)' },
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

export function evaluate(grid: number[][], func: { expression: string }) {
    // Use mathjs to evaluate the expression
    const scope = { grid };
    return Math.ceil(mathjsEvaluate(func.expression, scope) * 1000) / 1000; // Round to 3 decimal places
}

