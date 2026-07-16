import { describe, expect, it } from 'vitest'
import { filterUpcomingIncome } from './filterUpcomingIncome'
import type { RecurringIncome } from '../recurringIncome/types'

const base: RecurringIncome = {
  id: 1,
  description: 'Paycheck',
  source: 'Employer',
  amount: 100,
  cadence: 'MONTHLY',
  nextIncomeDate: '2026-07-15',
  active: true,
  notes: null,
  createdAt: '',
  updatedAt: '',
}

describe('filterUpcomingIncome', () => {
  it('returns all items when filters are empty', () => {
    expect(filterUpcomingIncome([base], {})).toEqual([base])
  })

  it('filters by month and year', () => {
    const august = { ...base, id: 2, nextIncomeDate: '2026-08-01' }
    expect(filterUpcomingIncome([base, august], { year: 2026, month: 7 })).toEqual([base])
  })

  it('filters by source case-insensitively', () => {
    const side = { ...base, id: 2, source: 'Side gig' }
    expect(filterUpcomingIncome([base, side], { source: 'employer' })).toEqual([base])
  })
})
