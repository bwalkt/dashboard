export function calculateSpecificPercentile(
  values: number[],
  percentile: number,
): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);

  if (Math.floor(index) === index) {
    return sorted[index] || 0;
  }

  const lower = sorted[Math.floor(index)] || 0;
  const upper = sorted[Math.ceil(index)] || 0;
  const weight = index % 1;

  return lower + (upper - lower) * weight;
}
