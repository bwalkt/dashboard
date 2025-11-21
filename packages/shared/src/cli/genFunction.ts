#!/usr/bin/env node

import { evaluate, genFunction, genGrid } from '../grid/grid.js'
import { toFullVerbose } from '../utils/functionShorthand.js'

const MIN_COMPLEXITY = 1
const MAX_COMPLEXITY = 4

interface CLIOptions {
  count: number
  size: number
  evaluate: boolean
  verbose: boolean
  stats: boolean
  help: boolean
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2)
  const options: CLIOptions = {
    count: 1,
    size: 5,
    evaluate: false,
    verbose: false,
    stats: false,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '-n':
      case '--count':
        options.count = parseInt(args[++i]) || 1
        break
      case '-s':
      case '--size':
        options.size = parseInt(args[++i]) || 10
        break
      case '-e':
      case '--evaluate':
        options.evaluate = true
        break
      case '-v':
      case '--verbose':
        options.verbose = true
        break
      case '--stats':
        options.stats = true
        break
      case '-h':
      case '--help':
        options.help = true
        break
    }
  }

  return options
}

function showHelp() {
  console.log(`
🔢 Mathematical Function Generator

Generate millions of complex mathematical functions with random complexity levels.

USAGE:
  pnpm genFunction [options]

OPTIONS:
  -n, --count <num>       Number of functions to generate (default: 1)
  -s, --size <num>        Grid size for cell references (default: 5)
  -e, --evaluate          Evaluate functions with sample grid
  -v, --verbose           Show detailed function analysis
  --stats                 Show generation statistics
  -h, --help              Show this help message

COMPLEXITY:
  Complexity is randomly generated between ${MIN_COMPLEXITY} and ${MAX_COMPLEXITY}:
    1: Simple (44 templates) - basic operations, single functions, special functions, matrix stats
    2: Moderate (43 templates) - combinations of operations, special/bitwise functions, matrix operations
    3: Complex (47 templates) - nested operations, multiple functions, complex matrix combinations
    4: Complex+ (47 templates) - same as level 3

EXAMPLES:
  pnpm genFunction                      # Generate 1 function with random complexity
  pnpm genFunction -n 5                  # Generate 5 functions with random complexity
  pnpm genFunction -e                    # Generate and evaluate with random complexity
  pnpm genFunction -n 10 -v --stats      # Verbose output with statistics

MATHEMATICAL FUNCTIONS SUPPORTED:
  • Basic Arithmetic: add, subtract, multiply, divide, pow, sqrt, cbrt, abs, mod, gcd, lcm, etc.
  • Trigonometric: sin, cos, tan, asin, acos, atan, atan2
  • Hyperbolic: sinh, cosh, tanh, asinh, acosh, atanh
  • Logarithmic: log, log10, log2, exp
  • Rounding: ceil, floor, round, fix, sign
  • Comparison: max, min, hypot
  • Special Functions: gamma, factorial, combinations, permutations
  • Bitwise Operations: bitAnd, bitOr, bitXor, leftShift, rightLogShift
  • Statistical Functions: mean, median, mode, variance, std (on matrix subsets)
  • Matrix Operations: m (entire matrix), mr(rows), mc(columns) with ranges/patterns
  • Unit Conversions: temperature, length, mass, angle, volume
  • 60+ unique mathematical functions across 134 expression templates!

TEMPLATE DISTRIBUTION:
  134 total expression templates across complexity levels:
  • Level 1 (Simple): 44 templates - basic operations, single functions, special functions, matrix stats
  • Level 2 (Moderate): 43 templates - two-operation combinations, special/bitwise operations, matrix operations
  • Level 3+ (Complex): 47 templates - nested operations, multiple functions, complex matrix combinations

  With random x,y cell positions AND matrix subsetting, unique expressions scale exponentially!
`)
}

function formatComplexity(complexity: any) {
  return {
    Level: complexity.level,
    Depth: complexity.actualDepth,
    'Functions Used': complexity.functionCount,
    'Unique Functions': complexity.uniqueFunctions,
    'Grid References': complexity.cellReferences,
  }
}

function main() {
  const options = parseArgs()

  if (options.help) {
    showHelp()
    return
  }

  console.log('🔢 Mathematical Function Generator\n')

  if (options.stats) {
    console.log(`📊 Configuration:
  Complexity Range: ${MIN_COMPLEXITY}-${MAX_COMPLEXITY} (random)
  Function Count: ${options.count}
  Grid Size: ${options.size}x${options.size}
  Evaluation: ${options.evaluate ? 'Yes' : 'No'}
  Verbose: ${options.verbose ? 'Yes' : 'No'}
`)
  }

  // Generate sample grid if evaluation is requested
  let grid: number[][] | null = null
  if (options.evaluate) {
    grid = genGrid(options.size)
    console.log(`📋 Generated ${options.size}x${options.size} sample grid for evaluation:`)
    console.log('Grid contents:')
    grid.forEach((row, i) => {
      console.log(`  Row ${i}: [${row.join(', ')}]`)
    })
    console.log('')
  }

  const allStats = {
    totalFunctions: 0,
    totalComplexity: 0,
    uniqueFunctionsUsed: new Set<string>(),
    uniqueExpressions: new Set<string>(),
    expressionCounts: new Map<string, number>(),
    generationTime: 0,
    evaluationTime: 0,
  }

  // Generate functions
  for (let i = 0; i < options.count; i++) {
    // Generate random complexity between MIN_COMPLEXITY and MAX_COMPLEXITY
    const randomComplexity = Math.floor(Math.random() * (MAX_COMPLEXITY - MIN_COMPLEXITY + 1)) + MIN_COMPLEXITY

    const startTime = Date.now()
    let func = genFunction(randomComplexity, options.size)
    const genTime = Date.now() - startTime

    allStats.totalFunctions++
    allStats.totalComplexity += func.complexity.level
    allStats.generationTime += genTime
    func.functions.unique.forEach(f => allStats.uniqueFunctionsUsed.add(f))
    allStats.uniqueExpressions.add(func.expression)
    allStats.expressionCounts.set(func.expression, (allStats.expressionCounts.get(func.expression) || 0) + 1)

    console.log(`\n🎯 Function ${i + 1}/${options.count} (Complexity: ${randomComplexity}):`)
    console.log(`  ID: ${func.id}`)
    console.log(`  Expression: ${func.expression}`)
    console.log(`  Simplified: ${func.simplifiedExpression}`)
    console.log(`  x = grid[${func.xCell.row}][${func.xCell.col}], y = grid[${func.yCell.row}][${func.yCell.col}]`)

    if (options.verbose) {
      console.log(`  Description: ${func.readable}`)
      console.log(`  Complexity: ${JSON.stringify(formatComplexity(func.complexity), null, 4)}`)
      console.log(`  Functions Used: [${func.functions.unique.join(', ')}]`)
      console.log(`  Generation Time: ${func.metadata.generationTime}ms`)
      console.log(`  Estimated Combinations: ${func.metadata.estimatedCombinations.toLocaleString()}`)
    }

    // Evaluate if requested
    if (options.evaluate && grid) {
      let evalStart = Date.now()
      try {
        let result = evaluate(grid, {
          expression: func.expression,
          xCell: func.xCell,
          yCell: func.yCell,
        })
        let evalTime = Date.now() - evalStart

        // Check if result should trigger regeneration
        const shouldRegenerate = (r: any) => {
          // Don't regenerate for "1 + 0i" or similar valid complex results
          if (typeof r === 'string' && r.includes('+ 0i')) {
            return false
          }
          // Only regenerate for infinity/NaN (0 is a valid result)
          return typeof r === 'number' && !isFinite(r)
        }

        // Limit regeneration attempts to prevent infinite loops
        const MAX_REGENERATION_ATTEMPTS = 10
        let regenerationCount = 0

        while (shouldRegenerate(result) && regenerationCount < MAX_REGENERATION_ATTEMPTS) {
          regenerationCount++
          console.log(
            `  ⚠️  Result was ${result}, regenerating function... (attempt ${regenerationCount}/${MAX_REGENERATION_ATTEMPTS})`,
          )

          // Track regeneration time
          const regenStart = Date.now()
          func = genFunction(randomComplexity, options.size)
          const regenTime = Date.now() - regenStart
          allStats.generationTime += regenTime

          // Re-evaluate with fresh timing
          evalStart = Date.now()
          result = evaluate(grid, {
            expression: func.expression,
            xCell: func.xCell,
            yCell: func.yCell,
          })
          evalTime = Date.now() - evalStart

          // Update function details after regeneration
          console.log(`  🔄 New Function:`)
          console.log(`  ID: ${func.id}`)
          console.log(`  Expression: ${func.expression}`)
          console.log(`  Simplified: ${func.simplifiedExpression}`)
          console.log(
            `  x = grid[${func.xCell.row}][${func.xCell.col}], y = grid[${func.yCell.row}][${func.yCell.col}]`,
          )
        }

        // Warn if max attempts reached
        if (regenerationCount >= MAX_REGENERATION_ATTEMPTS && shouldRegenerate(result)) {
          console.log(`  ⚠️  Max regeneration attempts reached, keeping result: ${result}`)
        }

        allStats.evaluationTime += evalTime
        const xVal = grid[func.xCell.row][func.xCell.col]
        const yVal = grid[func.yCell.row][func.yCell.col]
        console.log(`  ✅ Evaluation Result: ${result} (x=${xVal}, y=${yVal})`)
        if (options.verbose) {
          console.log(`  Evaluation Time: ${evalTime}ms`)
        }
      } catch (error) {
        console.log(`  ❌ Evaluation Error: ${error}`)
      }
    }
  }

  // Show final statistics
  if (options.stats || options.count > 1) {
    const duplicates = allStats.totalFunctions - allStats.uniqueExpressions.size

    // Calculate duplicate distribution: how many functions appeared X times
    const frequencyDistribution = new Map<number, number>()
    for (const count of allStats.expressionCounts.values()) {
      frequencyDistribution.set(count, (frequencyDistribution.get(count) || 0) + 1)
    }

    console.log(`\n📈 Generation Statistics:
  Total Functions Generated: ${allStats.totalFunctions}
  Unique Expressions: ${allStats.uniqueExpressions.size}
  Total Duplicated Functions (w/o x,y): ${duplicates}
  Average Complexity: ${(allStats.totalComplexity / allStats.totalFunctions).toFixed(2)}
  Unique Mathematical Functions Used: ${allStats.uniqueFunctionsUsed.size}
  Total Generation Time: ${allStats.generationTime}ms
  ${options.evaluate ? `Total Evaluation Time: ${allStats.evaluationTime}ms` : ''}
  Functions Per Second: ${allStats.generationTime > 0 ? (allStats.totalFunctions / (allStats.generationTime / 1000)).toFixed(2) : 'N/A (instant)'}
 `)

    // Show duplicate distribution
    if (duplicates > 0 && (options.stats || options.verbose)) {
      console.log(`\n📊 Duplicate Distribution:`)
      // Sort by frequency (descending)
      const sortedFrequencies = Array.from(frequencyDistribution.entries())
        .filter(([count]) => count > 1) // Only show duplicates
        .sort((a, b) => b[0] - a[0]) // Sort by count descending

      for (const [count, numExpressions] of sortedFrequencies) {
        console.log(`  ${numExpressions} expression${numExpressions > 1 ? 's' : ''} appeared ${count} times`)
      }
    }

    if (options.verbose) {
      console.log(`\n  Mathematical Functions Used: [${Array.from(allStats.uniqueFunctionsUsed).join(', ')}]`)
    }
  }

  console.log(
    `\n🎉 Function generation complete! Generated ${options.count} function${options.count > 1 ? 's' : ''} with random complexity (${MIN_COMPLEXITY}-${MAX_COMPLEXITY}).`,
  )

  if (!options.evaluate) {
    console.log(`💡 Tip: Add -e flag to evaluate functions with sample grid data!`)
  }
}

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
