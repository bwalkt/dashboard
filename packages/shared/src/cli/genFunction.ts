#!/usr/bin/env node

import { genFunction, genGrid, evaluate } from '../grid/grid.js';

const MIN_COMPLEXITY = 1;
const MAX_COMPLEXITY = 4;

interface CLIOptions {
    count: number;
    size: number;
    evaluate: boolean;
    verbose: boolean;
    stats: boolean;
    help: boolean;
}

function parseArgs(): CLIOptions {
    const args = process.argv.slice(2);
    const options: CLIOptions = {
        count: 1,
        size: 10,
        evaluate: false,
        verbose: false,
        stats: false,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '-n':
            case '--count':
                options.count = parseInt(args[++i]) || 1;
                break;
            case '-s':
            case '--size':
                options.size = parseInt(args[++i]) || 10;
                break;
            case '-e':
            case '--evaluate':
                options.evaluate = true;
                break;
            case '-v':
            case '--verbose':
                options.verbose = true;
                break;
            case '--stats':
                options.stats = true;
                break;
            case '-h':
            case '--help':
                options.help = true;
                break;
        }
    }

    return options;
}

function showHelp() {
    console.log(`
🔢 Mathematical Function Generator

Generate millions of complex mathematical functions with random complexity levels.

USAGE:
  pnpm genFunction [options]

OPTIONS:
  -n, --count <num>       Number of functions to generate (default: 1)
  -s, --size <num>        Grid size for cell references (default: 10)
  -e, --evaluate          Evaluate functions with sample grid
  -v, --verbose           Show detailed function analysis
  --stats                 Show generation statistics
  -h, --help              Show this help message

COMPLEXITY:
  Complexity is randomly generated between ${MIN_COMPLEXITY} and ${MAX_COMPLEXITY}:
    1: Single function
    2: Nested functions  
    3: Triple nested
    4: Multi-level composition

EXAMPLES:
  pnpm genFunction                      # Generate 1 function with random complexity
  pnpm genFunction -n 5                  # Generate 5 functions with random complexity
  pnpm genFunction -e                    # Generate and evaluate with random complexity
  pnpm genFunction -n 10 -v --stats      # Verbose output with statistics

MATHEMATICAL FUNCTIONS SUPPORTED:
  • Basic Arithmetic: add, subtract, multiply, divide, pow, sqrt, etc.
  • Trigonometric: sin, cos, tan, asin, acos, atan, sinh, cosh, tanh
  • Logarithmic: log, ln, log10, log2, exp, exp2, exp10
  • Statistical: mean, variance, std, median, quantile
  • Special: gamma, beta, erf, fibonacci, factorial
  • Geometric: hypot, distance, degrees, radians
  • And 100+ more mathematical functions!

MILLIONS OF COMBINATIONS:
  With 100+ base functions and nesting levels, this generator can create:
  • Level 1: ~100 functions
  • Level 2: ~10,000 combinations  
  • Level 3: ~1,000,000 combinations
  • Level 4+: Virtually unlimited!
`);
}

function formatComplexity(complexity: any) {
    return {
        'Level': complexity.level,
        'Depth': complexity.actualDepth,
        'Functions Used': complexity.functionCount,
        'Unique Functions': complexity.uniqueFunctions,
        'Grid References': complexity.cellReferences
    };
}

function main() {
    const options = parseArgs();

    if (options.help) {
        showHelp();
        return;
    }

    console.log('🔢 Mathematical Function Generator\n');
    
    if (options.stats) {
        console.log(`📊 Configuration:
  Complexity Range: ${MIN_COMPLEXITY}-${MAX_COMPLEXITY} (random)
  Function Count: ${options.count}
  Grid Size: ${options.size}x${options.size}
  Evaluation: ${options.evaluate ? 'Yes' : 'No'}
  Verbose: ${options.verbose ? 'Yes' : 'No'}
`);
    }

    // Generate sample grid if evaluation is requested
    let grid: number[][] | null = null;
    if (options.evaluate) {
        grid = genGrid(options.size);
        console.log(`📋 Generated ${options.size}x${options.size} sample grid for evaluation:`);
        console.log('Grid contents:');
        grid.forEach((row, i) => {
            console.log(`  Row ${i}: [${row.join(', ')}]`);
        });
        console.log('');
    }

    const allStats = {
        totalFunctions: 0,
        totalComplexity: 0,
        uniqueFunctionsUsed: new Set<string>(),
        generationTime: 0,
        evaluationTime: 0
    };

    // Generate functions
    for (let i = 0; i < options.count; i++) {
        // Generate random complexity between MIN_COMPLEXITY and MAX_COMPLEXITY
        const randomComplexity = Math.floor(Math.random() * (MAX_COMPLEXITY - MIN_COMPLEXITY + 1)) + MIN_COMPLEXITY;
        
        const startTime = Date.now();
        let func = genFunction(randomComplexity, options.size);
        const genTime = Date.now() - startTime;
        
        allStats.totalFunctions++;
        allStats.totalComplexity += func.complexity.level;
        allStats.generationTime += genTime;
        func.functions.unique.forEach(f => allStats.uniqueFunctionsUsed.add(f));

        console.log(`\n🎯 Function ${i + 1}/${options.count} (Complexity: ${randomComplexity}):`);
        console.log(`  ID: ${func.id}`);
        console.log(`  Expression: ${func.expression}`);
        
        if (options.verbose) {
            console.log(`  Description: ${func.readable}`);
            console.log(`  Complexity: ${JSON.stringify(formatComplexity(func.complexity), null, 4)}`);
            console.log(`  Functions Used: [${func.functions.unique.join(', ')}]`);
            console.log(`  Generation Time: ${func.metadata.generationTime}ms`);
            console.log(`  Estimated Combinations: ${func.metadata.estimatedCombinations.toLocaleString()}`);
        }

        // Evaluate if requested
        if (options.evaluate && grid) {
            const evalStart = Date.now();
            try {
                let result = evaluate(grid, { expression: func.expression });
                let evalTime = Date.now() - evalStart;
                
                // Regenerate if result is 0 or infinity
                while (result === 0 || !isFinite(result)) {
                    console.log(`  ⚠️  Result was ${result}, regenerating function...`);
                    func = genFunction(randomComplexity, options.size);
                    result = evaluate(grid, { expression: func.expression });
                    evalTime = Date.now() - evalStart;
                    
                    // Update function details after regeneration
                    console.log(`  🔄 New Function:`);
                    console.log(`  ID: ${func.id}`);
                    console.log(`  Expression: ${func.expression}`);
                }
                
                allStats.evaluationTime += evalTime;
                console.log(`  ✅ Evaluation Result: ${result}`);
                if (options.verbose) {
                    console.log(`  Evaluation Time: ${evalTime}ms`);
                }
            } catch (error) {
                console.log(`  ❌ Evaluation Error: ${error}`);
            }
        }
    }

    // Show final statistics
    if (options.stats || options.count > 1) {
        console.log(`\n📈 Generation Statistics:
  Total Functions Generated: ${allStats.totalFunctions}
  Average Complexity: ${(allStats.totalComplexity / allStats.totalFunctions).toFixed(2)}
  Unique Mathematical Functions Used: ${allStats.uniqueFunctionsUsed.size}
  Total Generation Time: ${allStats.generationTime}ms
  ${options.evaluate ? `Total Evaluation Time: ${allStats.evaluationTime}ms` : ''}
  Functions Per Second: ${(allStats.totalFunctions / (allStats.generationTime / 1000)).toFixed(2)}
`);

        if (options.verbose) {
            console.log(`  Mathematical Functions Used: [${Array.from(allStats.uniqueFunctionsUsed).join(', ')}]`);
        }
    }

    console.log(`\n🎉 Function generation complete! Generated ${options.count} function${options.count > 1 ? 's' : ''} with random complexity (${MIN_COMPLEXITY}-${MAX_COMPLEXITY}).`);
    
    if (!options.evaluate) {
        console.log(`💡 Tip: Add -e flag to evaluate functions with sample grid data!`);
    }
}

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}