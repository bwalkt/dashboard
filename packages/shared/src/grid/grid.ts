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
    { name: 'matrix.randomFunc', params: -1, example: 'matrix.randomFunc(grid)' },
    
    // TS-Stats operations (special handling required)
    { name: 'tsStats.average', params: -2, example: 'tsStats.average(numbers)' },
    { name: 'tsStats.median', params: -2, example: 'tsStats.median(numbers)' },
    { name: 'tsStats.mode', params: -2, example: 'tsStats.mode(numbers)' },
    { name: 'tsStats.variance', params: -2, example: 'tsStats.variance(numbers)' },
    { name: 'tsStats.correlation', params: -2, example: 'tsStats.correlation(arr1, arr2)' },
    { name: 'tsStats.randomStatsFunc', params: -2, example: 'tsStats.randomStatsFunc(numbers)' }
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
                if (mathFunc.name === 'matrix.randomFunc') {
                    return `${mathFunc.name}(grid)`;
                }
                return `${mathFunc.name}(grid, ${rowOrCol})`;
            }
            // TS-Stats operations (params = -2)
            else if (mathFunc.params === -2) {
                // Generate array of cell references
                const numCells = 3 + Math.floor(Math.random() * 5); // 3-7 cells
                const cells = [];
                for (let j = 0; j < numCells; j++) {
                    const cell = {
                        row: Math.floor(Math.random() * size),
                        col: Math.floor(Math.random() * size)
                    };
                    usedCells.push(cell);
                    cells.push(`grid[${cell.row}][${cell.col}]`);
                }
                if (mathFunc.name === 'tsStats.correlation') {
                    const cells2 = [];
                    for (let j = 0; j < numCells; j++) {
                        const cell = {
                            row: Math.floor(Math.random() * size),
                            col: Math.floor(Math.random() * size)
                        };
                        usedCells.push(cell);
                        cells2.push(`grid[${cell.row}][${cell.col}]`);
                    }
                    return `${mathFunc.name}([${cells.join(', ')}], [${cells2.join(', ')}])`;
                }
                return `${mathFunc.name}([${cells.join(', ')}])`;
            }
        }
        
        const params: string[] = [];
        
        for (let i = 0; i < mathFunc.params; i++) {
            if (Math.random() < 0.6 && depth < maxDepth - 1) {
                // 60% chance to nest another function (if not at max depth)
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
        
        
        // Use mathjs to evaluate the expression
        const scope = { 
            grid, 
            pi: Math.PI,
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
        () => Math.abs(grid[0][0] % 100),  // Modulo to keep result small
        () => Math.min(grid[0][0] || 1, 1000),  // Clamp to reasonable range
        () => Math.sqrt(Math.abs(grid[0][0] || 4)),  // Safe square root
        () => Math.ceil(Math.abs(grid[1][1] || 5) / 10),  // Division to reduce magnitude
        () => Math.floor(Math.abs(grid[2][2] || 7) / 5),  // Another safe division
        () => (grid[0][1] || 3) + (grid[1][0] || 2),  // Simple addition
        () => Math.max(1, Math.abs(grid[0][0] || 1) % 50),  // Modulo with minimum
        () => Math.round(Math.sin(Math.abs(grid[1][1] || 30) * Math.PI / 180) * 100) / 100,  // Safe trig
    ];
    
    const randomIndex = Math.floor(Math.random() * safeAlternatives.length);
    try {
        return Math.round(safeAlternatives[randomIndex]() * 1000) / 1000;
    } catch {
        return Math.floor(Math.random() * 10) + 1;  // Fallback random number
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
        
        // Extract function name and parameters
        if (expression.includes('matrix.randomFunc(grid)')) {
            const result = math1.randomFunc(grid);
            return typeof result.result === 'function' ? result.result().value || 0 : 0;
        }
        
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
        
        // Handle randomStatsFunc
        if (expression.includes('tsStats.randomStatsFunc')) {
            const arrayMatch = expression.match(/tsStats\.randomStatsFunc\(\[([^\]]+)\]\)/);
            if (arrayMatch) {
                const values = extractGridValues(grid, arrayMatch[1]);
                const result = math1.randomStatsFunc(values);
                return typeof result.result === 'function' ? result.result().value || 0 : 0;
            }
        }
        
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
                    return math1.statsAverage(values);
                case 'median':
                    return math1.statsMedian(values);
                case 'mode':
                    const mode = math1.statsMode(values);
                    return Array.isArray(mode) && mode.length > 0 ? mode[0] : 0;
                case 'variance':
                    return math1.statsVariance(values);
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

