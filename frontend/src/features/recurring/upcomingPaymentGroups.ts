import type { RecurringExpense } from './types'

export type UpcomingPeriodId = 'thisMonth' | 'nextMonth'

export type UpcomingPeriodGroup<T> = {
  id: UpcomingPeriodId
  label: string
  rangeLabel: string
  items: T[]
  totalAmount: number
  defaultOpen: boolean
}

function parseIso(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day }
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function endOfMonth(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate()
  return toIso(year, month, lastDay)
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta
  return {
    year: Math.floor(index / 12),
    month: (index % 12) + 1,
  }
}

function formatMonthYear(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: 'short',
    year: 'numeric',
  })
}

type PeriodBounds = {
  id: UpcomingPeriodId
  label: string
  rangeLabel: string
  startInclusive: string
  endInclusive: string
  defaultOpen: boolean
}

export type UpcomingPeriodLabels = {
  thisMonth: string
  nextMonth: string
}

const DEFAULT_LABELS: UpcomingPeriodLabels = {
  thisMonth: 'This month',
  nextMonth: 'Next month',
}

function buildPeriodBounds(todayIso: string, labels: UpcomingPeriodLabels): PeriodBounds[] {
  const { year, month } = parseIso(todayIso)
  const thisMonthEnd = endOfMonth(year, month)
  const next = addMonths(year, month, 1)
  const nextMonthStart = toIso(next.year, next.month, 1)
  const nextMonthEnd = endOfMonth(next.year, next.month)

  return [
    {
      id: 'thisMonth',
      label: labels.thisMonth,
      // Include overdue schedules whose next date is still unpaid.
      rangeLabel: formatMonthYear(year, month),
      startInclusive: '0001-01-01',
      endInclusive: thisMonthEnd,
      defaultOpen: true,
    },
    {
      id: 'nextMonth',
      label: labels.nextMonth,
      rangeLabel: formatMonthYear(next.year, next.month),
      startInclusive: nextMonthStart,
      endInclusive: nextMonthEnd,
      defaultOpen: false,
    },
  ]
}

/** ISO date for the last day of a calendar month (month is 1–12). */
export function endOfCalendarMonth(year: number, month: number): string {
  return endOfMonth(year, month)
}

function daysFromTodayThrough(todayIso: string, endInclusive: string): number {
  const start = new Date(`${todayIso}T00:00:00`)
  const end = new Date(`${endInclusive}T00:00:00`)
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(diff, 0)
}

/**
 * Days from today through the end of next calendar month.
 * When a target month/year is provided, extends the window through that month if later.
 */
export function upcomingFetchDays(
  todayIso: string,
  throughYear?: number,
  throughMonth?: number,
): number {
  const { year, month } = parseIso(todayIso)
  const next = addMonths(year, month, 1)
  const nextMonthEnd = endOfMonth(next.year, next.month)
  let days = Math.max(daysFromTodayThrough(todayIso, nextMonthEnd), 28)

  if (throughYear !== undefined && throughMonth !== undefined) {
    const targetEnd = endOfMonth(throughYear, throughMonth)
    days = Math.max(days, daysFromTodayThrough(todayIso, targetEnd), 28)
  }

  return days
}

export function groupUpcomingByNextDate<T extends { id: number; amount: number }>(
  items: T[],
  todayIso: string,
  getNextDate: (item: T) => string,
  labels: UpcomingPeriodLabels = DEFAULT_LABELS,
): UpcomingPeriodGroup<T>[] {
  const periods = buildPeriodBounds(todayIso, labels)
  const sorted = [...items].sort((a, b) => {
    const dateA = getNextDate(a)
    const dateB = getNextDate(b)
    if (dateA < dateB) return -1
    if (dateA > dateB) return 1
    return a.id - b.id
  })

  return periods
    .map((period) => {
      const periodItems = sorted.filter((item) => {
        const nextDate = getNextDate(item)
        return nextDate >= period.startInclusive && nextDate <= period.endInclusive
      })
      return {
        id: period.id,
        label: period.label,
        rangeLabel: period.rangeLabel,
        items: periodItems,
        totalAmount: periodItems.reduce((sum, item) => sum + item.amount, 0),
        defaultOpen: period.defaultOpen,
      }
    })
    .filter((group) => group.items.length > 0)
}

export function groupUpcomingPayments(
  items: RecurringExpense[],
  todayIso: string,
): UpcomingPeriodGroup<RecurringExpense>[] {
  return groupUpcomingByNextDate(items, todayIso, (item) => item.nextPaymentDate, {
    thisMonth: "This month's remaining bills",
    nextMonth: "Next month's bills",
  })
}
