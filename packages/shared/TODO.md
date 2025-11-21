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