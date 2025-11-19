/**
 * Utilities for converting between verbose and compact grid reference syntax
 * Converts grid[4][0] <-> g4.0 format
 */

/**
 * Converts verbose grid references to compact format
 * @param expression Expression with grid[row][col] references
 * @returns Expression with g<row>.<col> references
 *
 * @example
 * toCompact("add(grid[4][0], grid[1][2])") => "add(g4.0, g1.2)"
 */
export function toCompactGrid(expression: string): string {
  // Match grid[number][number] pattern
  return expression.replace(/grid\[(\d+)\]\[(\d+)\]/g, "g$1.$2");
}

/**
 * Converts compact grid references to verbose format
 * @param expression Expression with g<row>.<col> references
 * @returns Expression with grid[row][col] references
 *
 * @example
 * toVerbose("add(g4.0, g1.2)") => "add(grid[4][0], grid[1][2])"
 */
export function toVerboseGrid(expression: string): string {
  // Match g<number>.<number> pattern
  return expression.replace(/g(\d+)\.(\d+)/g, "grid[$1][$2]");
}

/**
 * Analyzes an expression and returns grid reference statistics
 */
export interface GridReferenceStats {
  originalLength: number;
  compactLength: number;
  savedBytes: number;
  savedPercentage: number;
  referenceCount: number;
}

/**
 * Analyzes space savings from using compact format
 */
export function analyzeGridCompaction(expression: string): GridReferenceStats {
  const compact = toCompactGrid(expression);
  const referenceCount = (expression.match(/grid\[\d+\]\[\d+\]/g) || []).length;
  const originalLength = expression.length;
  const savedBytes = originalLength - compact.length;
  // Avoid NaN for empty expressions
  const savedPercentage = originalLength === 0 ? 0 : (savedBytes / originalLength) * 100;

  return {
    originalLength,
    compactLength: compact.length,
    savedBytes,
    savedPercentage,
    referenceCount,
  };
}

/**
 * Validates that a compact expression can be properly converted
 */
export function isValidCompactExpression(expression: string): boolean {
  // Check for valid g<number>.<number> patterns
  const matches = expression.match(/g(\d+)\.(\d+)/g);
  if (!matches) return true; // No grid references is valid

  // Ensure all matches are well-formed
  for (const match of matches) {
    if (!match.match(/^g\d+\.\d+$/)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates that a verbose expression can be properly converted
 */
export function isValidVerboseExpression(expression: string): boolean {
  // Check for valid grid[number][number] patterns
  const matches = expression.match(/grid\[\d+\]\[\d+\]/g);
  if (!matches) return true; // No grid references is valid

  return true; // grid[n][n] pattern is always valid if matched
}

/**
 * Extracts all grid references from an expression
 */
export interface GridReference {
  row: number;
  col: number;
  original: string;
  compact: string;
}

/**
 * Extracts grid references from either format
 */
export function extractGridReferences(expression: string): GridReference[] {
  const references: GridReference[] = [];

  // Check for verbose format
  const verboseMatches = expression.matchAll(/grid\[(\d+)\]\[(\d+)\]/g);
  for (const match of verboseMatches) {
    references.push({
      row: parseInt(match[1]),
      col: parseInt(match[2]),
      original: match[0],
      compact: `g${match[1]}.${match[2]}`,
    });
  }

  // Check for compact format
  const compactMatches = expression.matchAll(/g(\d+)\.(\d+)/g);
  for (const match of compactMatches) {
    references.push({
      row: parseInt(match[1]),
      col: parseInt(match[2]),
      original: `grid[${match[1]}][${match[2]}]`,
      compact: match[0],
    });
  }

  return references;
}

/**
 * Batch converts multiple expressions to compact format
 */
export function batchToCompact(expressions: string[]): string[] {
  return expressions.map(toCompactGrid);
}

/**
 * Batch converts multiple expressions to verbose format
 */
export function batchToVerbose(expressions: string[]): string[] {
  return expressions.map(toVerboseGrid);
}

/**
 * Creates a mixed format where only long expressions use compact notation
 */
export function smartCompact(expression: string, threshold: number = 1000): string {
  if (expression.length < threshold) {
    return expression; // Keep verbose for short expressions
  }
  return toCompactGrid(expression);
}

/**
 * Demonstration of space savings with real examples
 */
export function demonstrateSavings(): void {
  const examples = [
    "add(grid[4][0], grid[1][2])",
    "multiply(sin(grid[0][1]), cos(grid[0][2]))",
    "stats.mean([grid[2][3], grid[1][2], grid[3][2], grid[0][1], grid[1][0], grid[4][3]])",
    "timeseries.changePointDetection([hypot(linalg.qrDecomposition(grid), floor(grid[0][3])), timeseries.differencing([grid[2][3], cosh(grid[3][3]), grid[2][3], timeseries.holtWinters([grid[2][1], grid[4][0], grid[1][2], grid[4][1], grid[3][2], grid[2][0], grid[0][1], grid[0][3], grid[3][3], grid[4][2], grid[3][1], grid[1][3], grid[4][2], grid[3][3], grid[0][0]]), tanh(grid[1][0]), asec(grid[0][1]), linalg.qrDecomposition(grid), grid[3][0], cos(grid[4][1])], 2)])",
  ];

  console.log("🔄 Grid Reference Compaction Examples:\n");
  console.log("=".repeat(60));

  examples.forEach((expr, index) => {
    const stats = analyzeGridCompaction(expr);
    const compact = toCompactGrid(expr);

    console.log(`\nExample ${index + 1}:`);
    console.log(`Original (${stats.originalLength} chars):`);
    console.log(`  ${expr.substring(0, 80)}${expr.length > 80 ? "..." : ""}`);
    console.log(`Compact (${stats.compactLength} chars):`);
    console.log(`  ${compact.substring(0, 80)}${compact.length > 80 ? "..." : ""}`);
    console.log(`Savings: ${stats.savedBytes} bytes (${stats.savedPercentage.toFixed(1)}%)`);
    console.log(`Grid references: ${stats.referenceCount}`);
  });

  console.log("\n" + "=".repeat(60));
}

// // If running directly, demonstrate the usage
// if (import.meta.url === `file://${process.argv[1]}`) {
//   demonstrateSavings()
// }
