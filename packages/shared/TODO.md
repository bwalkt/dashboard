1. First time I open the app
   - machine.cs (part of init)
   - addContact for me
   - getContact for me
   - addContact SFDC app
   - getContact for SDFC app

   (SecurePoint, SecureWallet, Math, ContactPoint)

# Mathematical Functions to Add Back

The following functions were removed from `MATH_FUNCTIONS` because they are not available in mathjs. These need to be investigated and potentially re-added if mathjs alternatives exist or custom implementations are created.

## Logarithmic & Exponential Functions
- `ln` - Natural logarithm (might be alias for `log`)
- `exp2` - 2^x exponential function
- `exp10` - 10^x exponential function  
- `expm1` - exp(x) - 1 for small x
- `log1p` - log(1 + x) for small x

## Probability & Random Functions
- `random` - Random number generator (0 params)
- `uniform` - Uniform distribution random (min, max)
- `normal` - Normal distribution random (mean, std)
- `binomial` - Binomial distribution random (n, p)
- `poisson` - Poisson distribution random (lambda)

## Complex Numbers (Alternative Names)
- `real` - Real part of complex number (vs `re`)
- `imag` - Imaginary part of complex number (vs `im`) 
- `conjugate` - Complex conjugate (vs `conj`)
- `polar` - Create complex from polar coordinates (r, theta)

## Calculus-inspired Functions
- `derivative` - Numerical derivative approximation (f, x)
- `integral` - Numerical integration (f, a, b)
- `limit` - Numerical limit approximation (f, x)

## Number Theory & Special Functions
- `isPrime` - Prime number test (n)
- `fibonacci` - Fibonacci sequence (n)
- `lucas` - Lucas sequence (n)
- `catalan` - Catalan numbers (n)
- `stirling` - Stirling numbers (n, k)
- `bell` - Bell numbers (n)

## Additional Statistical Functions
- `variance` - Statistical variance (a, b)
- `std` - Standard deviation (a, b)
- `range` - Range (max - min) (a, b)
- `median` - Median value (a, b)
- `mode` - Mode (most frequent) (a, b)
- `quantile` - Quantile calculation (a, b, q)

## Additional Mathematical Functions
- `factorial` - Factorial function (n!)
- `combinations` - Combinations C(n,k)
- `permutations` - Permutations P(n,k)
- `trunc` - Truncate decimal part
- `clamp` - Clamp value between min/max (value, min, max)
- `degrees` - Convert radians to degrees
- `radians` - Convert degrees to radians
- `norm` - Vector norm (a, b)
- `distance` - Distance between points (a, b)
- `normalize` - Normalize vector (a, b)
- `beta` - Beta function (a, b)
- `erf` - Error function (a)
- `erfc` - Complementary error function (a)
- `zeta` - Riemann zeta function (a)

## Action Items
1. Research mathjs documentation for alternative function names
2. Test which of these functions might already be available under different names
3. Implement custom versions for missing but useful functions
4. Consider creating wrapper functions for complex mathematical operations
5. Add unit tests for any newly implemented functions




  There are still many mathjs functions we haven't tapped into yet, like:
  - Statistical functions (mean, median, mode, variance, std)
  - Matrix operations (det, trace, transpose - though we'd need matrix
  inputs)
  - Special functions (gamma, factorial, combinations, permutations)
  - Bitwise operations (bitAnd, bitOr, bitXor, leftShift, rightShift)
  - Comparison chains and logical operations
  - More complex nested combinations


  import { genGrid, genFunction, evaluate } from '@pzero/shared'

  const n = 100  // Generate 100 functions

  for (let i = 0; i < n; i++) {
    // Option 1: Everything random (complexity 1-3, size 5-10)
    const func = genFunction()
    const grid = genGrid(func.metadata.gridSize)  // Match the grid size

    const result = evaluate(grid, func)
    console.log(`${i + 1}. ${func.expression} = ${result}`)
  }

  Or if you want a fixed grid size but random complexity:

  import { genGrid, genFunction, evaluate } from '@pzero/shared'

  const n = 100
  const gridSize = 5
  const grid = genGrid(gridSize)  // One grid for all functions

  for (let i = 0; i < n; i++) {
    // Random complexity (1-3), fixed size
    const func = genFunction(undefined, gridSize)

    const result = evaluate(grid, func)
    console.log(`${i + 1}. ${func.expression} = ${result}`)
  }

  More complete example with statistics:

  import { genGrid, genFunction, evaluate } from '@pzero/shared'

  const n = 1000
  const uniqueExpressions = new Set()

  for (let i = 0; i < n; i++) {
    const func = genFunction()  // Random complexity
    const grid = genGrid(func.metadata.gridSize)

    const result = evaluate(grid, func)
    uniqueExpressions.add(func.expression)

    if (i < 10) {  // Show first 10
      console.log(`${i + 1}. ${func.expression}`)
      console.log(`   Complexity: ${func.complexity.level}`)
      console.log(`   Result: ${result}\n`)
    }
  }

  console.log(`\nGenerated ${n} functions`)
  console.log(`Unique expressions: ${uniqueExpressions.size}`)
  console.log(`Uniqueness: ${(uniqueExpressions.size / n *
  100).toFixed(2)}%`)

  Key points:

  - genFunction() - random complexity (1-3), random size (5-10)
  - genFunction(undefined, 5) - random complexity, fixed size 5
  - genFunction(2, 5) - complexity 2, size 5
  - Each function has func.metadata.gridSize you can use to create a
  matching grid
