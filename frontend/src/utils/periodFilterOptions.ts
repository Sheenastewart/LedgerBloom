/** Shared month/year options for ledger period filters. */

export const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
] as const

export const FILTER_YEAR_MIN = 1992
export const FILTER_YEAR_MAX = 2035

export const YEAR_OPTIONS: readonly number[] = Array.from(
  { length: FILTER_YEAR_MAX - FILTER_YEAR_MIN + 1 },
  (_, index) => FILTER_YEAR_MIN + index,
)

/** Current month (1-12) and year as strings, for defaulting month/year selects. */
export function currentPeriodValues(): { month: string; year: string } {
  const now = new Date()
  return {
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
  }
}
