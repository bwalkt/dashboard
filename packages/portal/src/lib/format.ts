/**
 * Format a date into an en-US locale string using sensible defaults.
 *
 * @param date - The date to format; may be a Date, an ISO date/time string, or a numeric timestamp. If falsy, an empty string is returned.
 * @param opts - Intl.DateTimeFormatOptions to customize the output. If not provided, `month` defaults to `"long"`, `day` to `"numeric"`, and `year` to `"numeric"`.
 * @returns The formatted date string for the en-US locale, or an empty string if the input is falsy or formatting fails.
 */
export function formatDate(date: Date | string | number | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!date) return ''

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: opts.month ?? 'long',
      day: opts.day ?? 'numeric',
      year: opts.year ?? 'numeric',
      ...opts,
    }).format(new Date(date))
  } catch (_err) {
    return ''
  }
}

/**
 * Format a numeric amount as an en-US currency string.
 *
 * @param amount - The numeric amount to format; if `null` or `undefined`, returns `"$0.00"`.
 * @param currency - ISO 4217 currency code to use (defaults to `"USD"`).
 * @returns The amount formatted as a currency string for the `en-US` locale (e.g. `"$1,234.56"`); falls back to `"$<amount>.00"` using `toFixed(2)` if formatting fails.
 */
export function formatCurrency(amount: number | undefined | null, currency: string = 'USD') {
  if (amount === undefined || amount === null) return '$0.00'

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (_err) {
    return `$${amount.toFixed(2)}`
  }
}
