import type { MonthPeriod, MonthRange } from './types'

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export function monthLabel(period: MonthPeriod): string {
  return `${MONTH_NAMES[period.month - 1]} ${period.year}`
}

export function currentPeriod(): MonthPeriod {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

/** Returns a range spanning the last six months through (and including) the current month. */
export function lastSixMonthsRange(): MonthRange {
  const end = currentPeriod()
  const startDate = new Date(end.year, end.month - 1 - 5, 1)
  return {
    startYear: startDate.getFullYear(),
    startMonth: startDate.getMonth() + 1,
    endYear: end.year,
    endMonth: end.month,
  }
}

export function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1)
}

export function rangeMonthCount(range: MonthRange): number {
  return monthIndex(range.endYear, range.endMonth) - monthIndex(range.startYear, range.startMonth) + 1
}
