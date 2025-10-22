import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combine multiple class name values into a single string and resolve Tailwind class conflicts.
 *
 * @param inputs - One or more class name values (strings, arrays, or objects) to be merged
 * @returns The resulting merged class string with conflicting Tailwind classes resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a byte count into a human-readable string with an appropriate unit suffix.
 *
 * @param bytes - The number of bytes to format
 * @param opts - Formatting options
 * @param opts.decimals - Number of decimal places to include (default: 0)
 * @param opts.sizeType - Unit style: `'normal'` uses `KB/MB/...`, `'accurate'` uses `KiB/MiB/...` (default: `'normal'`)
 * @returns The formatted numeric value followed by a unit (for example, `1024 -> "1 KB"` or with `accurate` -> `"1 KiB"`)
 */
export function formatBytes(
  bytes: number,
  opts: {
    decimals?: number
    sizeType?: 'accurate' | 'normal'
  } = {},
) {
  const { decimals = 0, sizeType = 'normal' } = opts

  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const accurateSizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB']
  if (bytes === 0) return '0 Byte'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(decimals)} ${
    sizeType === 'accurate' ? (accurateSizes[i] ?? 'Bytest') : (sizes[i] ?? 'Bytes')
  }`
}
