import { describe, expect, it } from 'vitest'
import {
  advanceCadenceDate,
  expandUpcomingSchedules,
  occurrenceDatesInPeriod,
} from './expandRecurringOccurrences'

describe('occurrenceDatesInPeriod', () => {
  it('expands weekly allowance into each remaining payday this month', () => {
    // Today July 16, 2026; next payday July 17 → 17, 24, 31
    expect(
      occurrenceDatesInPeriod('2026-07-17', '2026-07-16', '2026-07-31', 'WEEKLY'),
    ).toEqual(['2026-07-17', '2026-07-24', '2026-07-31'])
  })

  it('leaves monthly schedules as a single date', () => {
    expect(
      occurrenceDatesInPeriod('2026-07-20', '2026-07-16', '2026-08-31', 'MONTHLY'),
    ).toEqual(['2026-07-20', '2026-08-20'])
  })
})

describe('advanceCadenceDate', () => {
  it('advances semimonthly using payment days', () => {
    expect(advanceCadenceDate('2026-07-01', 'SEMIMONTHLY', 1, 15)).toBe('2026-07-15')
    expect(advanceCadenceDate('2026-07-15', 'SEMIMONTHLY', 1, 15)).toBe('2026-08-01')
  })
})

describe('expandUpcomingSchedules', () => {
  it('expands a single weekly schedule into multiple rows and is idempotent', () => {
    const schedule = {
      id: 1,
      amount: 50,
      cadence: 'WEEKLY' as const,
      nextIncomeDate: '2026-07-17',
    }
    const once = expandUpcomingSchedules(
      [schedule],
      '2026-07-16',
      (item) => item.nextIncomeDate,
      (item, date) => ({ ...item, nextIncomeDate: date }),
      '2026-07-31',
    )
    expect(once.map((row) => row.nextIncomeDate)).toEqual([
      '2026-07-17',
      '2026-07-24',
      '2026-07-31',
    ])

    const twice = expandUpcomingSchedules(
      once,
      '2026-07-16',
      (item) => item.nextIncomeDate,
      (item, date) => ({ ...item, nextIncomeDate: date }),
      '2026-07-31',
    )
    expect(twice.map((row) => row.nextIncomeDate)).toEqual([
      '2026-07-17',
      '2026-07-24',
      '2026-07-31',
    ])
  })
})
