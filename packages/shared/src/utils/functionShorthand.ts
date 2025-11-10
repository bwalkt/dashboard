/**
 * Utilities for converting between verbose and compact function names
 * Converts stats.harmonicMean <-> s.hm, bitXor <-> bX, etc.
 */

/**
 * Function name mappings for compactification
 */
const FUNCTION_SHORTCUTS: Record<string, string> = {
  // Statistical functions
  "stats.mean": "s.m",
  "stats.median": "s.md",
  "stats.mode": "s.mo",
  "stats.variance": "s.v",
  "stats.standardDeviation": "s.sd",
  "stats.stdDev": "s.sd",
  "stats.zScore": "s.zs",
  "stats.harmonicMean": "s.hm",
  "stats.geometricMean": "s.gm",
  "stats.correlation": "s.cor",
  "stats.covariance": "s.cov",
  "stats.percentile": "s.p",
  "stats.quartiles": "s.q",
  "stats.outliers": "s.out",
  "stats.skewness": "s.sk",
  "stats.kurtosis": "s.ku",
  "stats.range": "s.r",

  // Time series functions
  "timeseries.movingAverage": "ts.ma",
  "timeseries.exponentialSmoothing": "ts.es",
  "timeseries.autocorrelation": "ts.ac",
  "timeseries.differencing": "ts.d",
  "timeseries.seasonalDecomposition": "ts.sd",
  "timeseries.simpleLinearForecast": "ts.slf",
  "timeseries.detectAnomaly": "ts.da",
  "timeseries.changePointDetection": "ts.cpd",
  "timeseries.holtWinters": "ts.hw",
  "timeseries.trendAnalysis": "ts.ta",

  // Signal processing functions
  "signal.fft": "sig.f",
  "signal.ifft": "sig.if",
  "signal.convolution": "sig.cv",
  "signal.crossCorrelation": "sig.cc",
  "signal.lowPassFilter": "sig.lp",
  "signal.highPassFilter": "sig.hp",
  "signal.bandPassFilter": "sig.bp",
  "signal.windowFunction": "sig.w",
  "signal.spectrogram": "sig.sp",
  "signal.peakDetection": "sig.pd",
  "signal.envelope": "sig.e",
  "signal.powerSpectrum": "sig.ps",

  // Matrix operations
  "matrix.sumRow": "m.sr",
  "matrix.sumCol": "m.sc",
  "matrix.avgRow": "m.ar",
  "matrix.avgCol": "m.ac",
  "matrix.maxRow": "m.mr",
  "matrix.maxCol": "m.mc",
  "matrix.minRow": "m.mir",
  "matrix.minCol": "m.mic",
  "matrix.stdDevRow": "m.sdr",
  "matrix.stdDevCol": "m.sdc",
  "matrix.medianRow": "m.mdr",
  "matrix.medianCol": "m.mdc",

  // Linear algebra functions
  "linalg.determinant": "la.det",
  "linalg.inverse": "la.inv",
  "linalg.transpose": "la.t",
  "linalg.eigenvalues": "la.eig",
  "linalg.svd": "la.svd",
  "linalg.qrDecomposition": "la.qr",
  "linalg.luDecomposition": "la.lu",
  "linalg.choleskyDecomposition": "la.chol",
  "linalg.norm": "la.n",
  "linalg.solveLinearSystem": "la.solve",

  // TS-Stats functions
  "tsStats.average": "tss.avg",
  "tsStats.median": "tss.md",
  "tsStats.variance": "tss.v",
  "tsStats.standardDeviation": "tss.sd",
  "tsStats.correlation": "tss.cor",
  "tsStats.mode": "tss.mo",

  // Bitwise operations
  bitAnd: "bA",
  bitOr: "bO",
  bitXor: "bX",
  bitNot: "bN",
  leftShift: "lS",
  rightShift: "rS",

  // Trigonometric functions (common ones)
  asin: "as",
  acos: "ac",
  atan: "at",
  atan2: "at2",
  sinh: "sh",
  cosh: "ch",
  tanh: "th",
  asinh: "ash",
  acosh: "ach",
  atanh: "ath",
  asec: "asec",
  acsc: "acsc",
  acot: "acot",

  // Common mathematical functions
  sqrt: "sq",
  cbrt: "cb",
  nthRoot: "nr",
  hypot: "hy",
  gamma: "ga",
  factorial: "fact",
  fibonacci: "fib",

  // Logarithmic functions
  log10: "lg",
  log2: "lg2",
  exp2: "e2",
  exp10: "e10",
};

/**
 * Reverse mapping for decompression
 */
const FUNCTION_EXPANSIONS: Record<string, string> = {};
for (const [long, short] of Object.entries(FUNCTION_SHORTCUTS)) {
  FUNCTION_EXPANSIONS[short] = long;
}

/**
 * Converts verbose function names to compact format
 * @param expression Expression with verbose function names
 * @returns Expression with compact function names
 *
 * @example
 * toCompactFunctions("stats.harmonicMean(g4.0, g1.2)") => "s.hm(g4.0, g1.2)"
 */
export function toCompactFunctions(expression: string): string {
  let result = expression;

  // Sort by length (longest first) to avoid partial replacements
  const sortedFunctions = Object.keys(FUNCTION_SHORTCUTS).sort((a, b) => b.length - a.length);

  for (const longForm of sortedFunctions) {
    const shortForm = FUNCTION_SHORTCUTS[longForm];
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${longForm.replace(/\./g, "\\.")}\\b`, "g");
    result = result.replace(regex, shortForm);
  }

  return result;
}

/**
 * Converts compact function names to verbose format
 * @param expression Expression with compact function names
 * @returns Expression with verbose function names
 *
 * @example
 * toVerboseFunctions("s.hm(g4.0, g1.2)") => "stats.harmonicMean(g4.0, g1.2)"
 */
export function toVerboseFunctions(expression: string): string {
  let result = expression;

  // Sort by length (longest first) to avoid partial replacements
  const sortedShortcuts = Object.keys(FUNCTION_EXPANSIONS).sort((a, b) => b.length - a.length);

  for (const shortForm of sortedShortcuts) {
    const longForm = FUNCTION_EXPANSIONS[shortForm];
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${shortForm.replace(/\./g, "\\.")}\\b`, "g");
    result = result.replace(regex, longForm);
  }

  return result;
}

/**
 * Converts grid[row][col] to g<row>.<col> format
 * (Duplicated from gridShorthand.ts to avoid circular dependencies)
 */
function gridToCompact(expression: string): string {
  return expression.replace(/grid\[(\d+)\]\[(\d+)\]/g, "g$1.$2");
}

/**
 * Converts g<row>.<col> to grid[row][col] format
 * (Duplicated from gridShorthand.ts to avoid circular dependencies)
 */
function gridToVerbose(expression: string): string {
  return expression.replace(/g(\d+)\.(\d+)/g, "grid[$1][$2]");
}

/**
 * Applies both grid and function compaction
 * @param expression Expression with verbose grid and function names
 * @returns Expression with compact grid and function names
 */
export function toFullCompact(expression: string): string {
  // Apply both transformations
  let result = gridToCompact(expression);
  result = toCompactFunctions(result);

  return result;
}

/**
 * Converts from full compact format back to verbose
 * @param expression Expression with compact grid and function names
 * @returns Expression with verbose grid and function names
 */
export function toFullVerbose(expression: string): string {
  // Apply both transformations (order matters - functions first, then grid)
  let result = toVerboseFunctions(expression);
  result = gridToVerbose(result);

  return result;
}

/**
 * Analyzes space savings from function name compaction
 */
export interface FunctionCompactionStats {
  originalLength: number;
  compactLength: number;
  savedBytes: number;
  savedPercentage: number;
  functionReplacements: number;
}

/**
 * Analyzes space savings from using compact function names
 */
export function analyzeFunctionCompaction(expression: string): FunctionCompactionStats {
  const compact = toCompactFunctions(expression);
  const originalLength = expression.length;

  // Count how many functions were replaced
  let functionReplacements = 0;
  for (const longForm of Object.keys(FUNCTION_SHORTCUTS)) {
    const regex = new RegExp(`\\b${longForm.replace(/\./g, "\\.")}\\b`, "g");
    const matches = expression.match(regex);
    if (matches) {
      functionReplacements += matches.length;
    }
  }

  const savedBytes = originalLength - compact.length;
  // Avoid NaN for empty expressions
  const savedPercentage = originalLength === 0 ? 0 : (savedBytes / originalLength) * 100;

  return {
    originalLength,
    compactLength: compact.length,
    savedBytes,
    savedPercentage,
    functionReplacements,
  };
}

/**
 * Analyzes space savings from full compaction (grid + functions)
 */
export function analyzeFullCompaction(expression: string): {
  original: number;
  gridOnly: number;
  functionsOnly: number;
  fullCompact: number;
  totalSaved: number;
  totalPercentage: number;
} {
  const gridOnly = gridToCompact(expression);
  const functionsOnly = toCompactFunctions(expression);
  const fullCompact = toFullCompact(expression);
  const original = expression.length;
  const totalSaved = original - fullCompact.length;
  // Avoid NaN for empty expressions
  const totalPercentage = original === 0 ? 0 : (totalSaved / original) * 100;

  return {
    original,
    gridOnly: gridOnly.length,
    functionsOnly: functionsOnly.length,
    fullCompact: fullCompact.length,
    totalSaved,
    totalPercentage,
  };
}

/**
 * Gets all available function shortcuts
 */
export function getFunctionShortcuts(): Record<string, string> {
  return { ...FUNCTION_SHORTCUTS };
}

/**
 * Checks if an expression uses compact function names
 */
export function hasCompactFunctions(expression: string): boolean {
  const shortForms = Object.keys(FUNCTION_EXPANSIONS);
  for (const shortForm of shortForms) {
    const regex = new RegExp(`\\b${shortForm.replace(/\./g, "\\.")}\\b`);
    if (regex.test(expression)) {
      return true;
    }
  }
  return false;
}

/**
 * Demonstration of function name compaction savings
 */
export function demonstrateFunctionSavings(): void {
  const examples = [
    "stats.harmonicMean(g4.0, g1.2)",
    "timeseries.exponentialSmoothing([g0.1, g1.2, g2.3], 0.5)",
    "signal.bandPassFilter([g1.0, g2.1, g3.2], 0.1, 0.4)",
    "matrix.stdDevCol(grid, 2) + linalg.determinant(grid)",
    "bitXor(leftShift(g4.0, 2), rightShift(g1.2, 1))",
    "stats.correlation([stats.mean([g0.0, g1.1]), timeseries.movingAverage([g2.2, g3.3], 3)], [signal.fft([g4.4, g0.1])])",
  ];

  console.log("🔧 Function Name Compaction Examples:\n");
  console.log("=".repeat(70));

  examples.forEach((expr, index) => {
    const stats = analyzeFunctionCompaction(expr);
    const compact = toCompactFunctions(expr);

    console.log(`\nExample ${index + 1}:`);
    console.log(`Original (${stats.originalLength} chars):`);
    console.log(`  ${expr}`);
    console.log(`Compact (${stats.compactLength} chars):`);
    console.log(`  ${compact}`);
    console.log(`Function savings: ${stats.savedBytes} bytes (${stats.savedPercentage.toFixed(1)}%)`);
    console.log(`Functions replaced: ${stats.functionReplacements}`);
  });

  console.log("\n" + "=".repeat(70));

  // Show combined savings
  const combinedExample =
    "timeseries.exponentialSmoothing([stats.harmonicMean([grid[0][0], grid[1][1]]), signal.bandPassFilter([grid[2][2], grid[3][3]], 0.1, 0.4)], 0.5)";
  console.log("\n🚀 Combined Grid + Function Compaction:");
  console.log(`Original: ${combinedExample}`);
  console.log(`Full Compact: ${toFullCompact(combinedExample)}`);

  const fullStats = analyzeFullCompaction(combinedExample);
  console.log(`\nSavings Breakdown:`);
  console.log(`  Original length: ${fullStats.original}`);
  console.log(`  Grid-only compact: ${fullStats.gridOnly} (saved ${fullStats.original - fullStats.gridOnly})`);
  console.log(`  Function-only compact: ${fullStats.functionsOnly} (saved ${fullStats.original - fullStats.functionsOnly})`);
  console.log(`  Full compact: ${fullStats.fullCompact} (saved ${fullStats.totalSaved})`);
  console.log(`  Total savings: ${fullStats.totalPercentage.toFixed(1)}%`);
}

// If running directly, demonstrate the usage
// if (import.meta.url === `file://${process.argv[1]}`) {
//     demonstrateFunctionSavings();
// }
