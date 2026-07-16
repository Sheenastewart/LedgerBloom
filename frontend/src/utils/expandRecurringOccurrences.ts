import type { RecurringCadence } from '../features/recurring/types'

type Cadence = RecurringCadence

type ScheduleLike = {
  id: number
  cadence: Cadence
  firstPaymentDay?: number | null
  secondPaymentDay?: number | null
}

function parseIso(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day }
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function addCalendarMonths(iso: string, months: number): string {
  const { year, month, day } = parseIso(iso)
  const index = year * 12 + (month - 1) + months
  const nextYear = Math.floor(index / 12)
  const nextMonth = (index % 12) + 1
  const clampedDay = Math.min(day, daysInMonth(nextYear, nextMonth))
  return toIso(nextYear, nextMonth, clampedDay)
}

function addCalendarYears(iso: string, years: number): string {
  return addCalendarMonths(iso, years * 12)
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toIso(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function dateForDayInMonth(year: number, month: number, dayOfMonth: number): string {
  const clamped = Math.min(Math.max(dayOfMonth, 1), daysInMonth(year, month))
  return toIso(year, month, clamped)
}

function nextSemimonthlyAfter(
  fromExclusive: string,
  firstPaymentDay: number,
  secondPaymentDay: number,
): string {
  const days = [firstPaymentDay, secondPaymentDay].sort((a, b) => a - b)
  let { year, month } = parseIso(fromExclusive)
  for (let step = 0; step < 512; step++) {
    for (const day of days) {
      const candidate = dateForDayInMonth(year, month, day)
      if (candidate > fromExclusive) {
        return candidate
      }
    }
    const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
    year = next.year
    month = next.month
  }
  throw new Error('Unable to advance semimonthly schedule')
}

/** Advance one cadence step from an occurrence date. */
export function advanceCadenceDate(
  from: string,
  cadence: Cadence,
  firstPaymentDay?: number | null,
  secondPaymentDay?: number | null,
): string {
  switch (cadence) {
    case 'WEEKLY':
      return addDays(from, 7)
    case 'BIWEEKLY':
      return addDays(from, 14)
    case 'MONTHLY':
      return addCalendarMonths(from, 1)
    case 'QUARTERLY':
      return addCalendarMonths(from, 3)
    case 'SEMIANNUAL':
      return addCalendarMonths(from, 6)
    case 'ANNUAL':
      return addCalendarYears(from, 1)
    case 'SEMIMONTHLY': {
      if (firstPaymentDay == null || secondPaymentDay == null) {
        return addCalendarMonths(from, 1)
      }
      return nextSemimonthlyAfter(from, firstPaymentDay, secondPaymentDay)
    }
    default:
      return addCalendarMonths(from, 1)
  }
}

/**
 * Project every occurrence date from the schedule's next due date through
 * {@code periodEndInclusive}, skipping dates before {@code periodStartInclusive}.
 */
export function occurrenceDatesInPeriod(
  nextDueDate: string,
  periodStartInclusive: string,
  periodEndInclusive: string,
  cadence: Cadence,
  firstPaymentDay?: number | null,
  secondPaymentDay?: number | null,
): string[] {
  if (periodEndInclusive < periodStartInclusive) {
    return []
  }

  let cursor = nextDueDate
  let steps = 0
  while (cursor < periodStartInclusive && steps < 512) {
    const advanced = advanceCadenceDate(cursor, cadence, firstPaymentDay, secondPaymentDay)
    if (advanced <= cursor) {
      throw new Error('Cadence advance must move strictly forward')
    }
    cursor = advanced
    steps++
  }

  const dates: string[] = []
  while (cursor <= periodEndInclusive && steps < 512) {
    if (cursor >= periodStartInclusive) {
      dates.push(cursor)
    }
    const advanced = advanceCadenceDate(cursor, cadence, firstPaymentDay, secondPaymentDay)
    if (advanced <= cursor) {
      throw new Error('Cadence advance must move strictly forward')
    }
    cursor = advanced
    steps++
  }
  return dates
}

function endOfNextMonth(todayIso: string): string {
  const { year, month } = parseIso(todayIso)
  const index = year * 12 + month // next month (month is 1-based; +1 month via index)
  const nextYear = Math.floor(index / 12)
  const nextMonth = (index % 12) + 1
  return toIso(nextYear, nextMonth, daysInMonth(nextYear, nextMonth))
}

/**
 * Expand schedule rows into one row per unpaid occurrence through the end of next month.
 * Idempotent when the API already expanded: schedules are re-projected from the earliest
 * next date per id.
 */
export function expandUpcomingSchedules<T extends ScheduleLike>(
  items: T[],
  todayIso: string,
  getNextDate: (item: T) => string,
  withOccurrenceDate: (item: T, occurrenceDate: string) => T,
  periodEndInclusive: string = endOfNextMonth(todayIso),
): T[] {
  const earliestById = new Map<number, T>()
  for (const item of items) {
    const existing = earliestById.get(item.id)
    if (!existing || getNextDate(item) < getNextDate(existing)) {
      earliestById.set(item.id, item)
    }
  }

  const expanded: T[] = []
  for (const schedule of earliestById.values()) {
    const dates = occurrenceDatesInPeriod(
      getNextDate(schedule),
      todayIso,
      periodEndInclusive,
      schedule.cadence,
      schedule.firstPaymentDay,
      schedule.secondPaymentDay,
    )
    for (const date of dates) {
      expanded.push(withOccurrenceDate(schedule, date))
    }
  }

  return expanded.sort((a, b) => {
    const dateA = getNextDate(a)
    const dateB = getNextDate(b)
    if (dateA !== dateB) {
      return dateA < dateB ? -1 : 1
    }
    return a.id - b.id
  })
}
