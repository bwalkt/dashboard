import { format } from 'date-fns'

export function formatLatency(ms: number): string {
  if (ms >= 1000) {
    return (
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(ms / 1000) + 's'
    )
  }

  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(ms) + 'ms'
}

export function formatMilliseconds(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value)
}

export function formatDate(value: Date | string) {
  return format(new Date(value), 'LLL dd, y HH:mm')
}

export function formatCompactNumber(value: number) {
  const isNegative = value < 0
  const absValue = Math.abs(value)

  let result: string
  if (absValue >= 100 && absValue < 1000) {
    result = absValue.toString()
  } else if (absValue >= 1000 && absValue < 1000000) {
    result = (absValue / 1000).toFixed(1) + 'k'
  } else if (absValue >= 1000000) {
    result = (absValue / 1000000).toFixed(1) + 'M'
  } else {
    result = absValue.toString()
  }

  return isNegative ? `-${result}` : result
}
