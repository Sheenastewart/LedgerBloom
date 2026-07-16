import { describe, expect, it } from 'vitest'
import { groupUpcomingPayments, upcomingFetchDays } from './upcomingPaymentGroups'
import type { RecurringExpense } from './types'

function expense(
  id: number,
  nextPaymentDate: string,
  amount = 10,
): RecurringExpense {
  return {
    id,
    description: `Item ${id}`,
    merchant: null,
    amount,
    category: { id: 1, name: 'Utilities' },
    cadence: 'MONTHLY',
    nextPaymentDate,
    active: true,
    notes: null,
    createdAt: '',
    updatedAt: '',
  }
}

describe('groupUpcomingPayments', () => {
  it('buckets into this month and next month only', () => {
    const groups = groupUpcomingPayments(
      [
        expense(1, '2026-07-20', 50),
        expense(2, '2026-08-15', 20),
        expense(3, '2026-09-01', 30),
        expense(4, '2026-07-01', 40),
      ],
      '2026-07-15',
    )

    expect(groups.map((group) => group.id)).toEqual(['thisMonth', 'nextMonth'])
    expect(groups[0]?.label).toBe("This month's remaining bills")
    expect(groups[0]?.items.map((item) => item.id)).toEqual([4, 1])
    expect(groups[0]?.totalAmount).toBe(90)
    expect(groups[1]?.label).toBe("Next month's bills")
    expect(groups[1]?.items.map((item) => item.id)).toEqual([2])
    expect(groups[1]?.totalAmount).toBe(20)
  })

  it('hides empty periods and opens this month by default', () => {
    const groups = groupUpcomingPayments([expense(1, '2026-08-01')], '2026-07-15')
    expect(groups).toHaveLength(1)
    expect(groups[0]?.id).toBe('nextMonth')
    expect(groups[0]?.defaultOpen).toBe(false)
  })

  it('keeps this month open by default when it has items', () => {
    const groups = groupUpcomingPayments([expense(1, '2026-07-20')], '2026-07-15')
    expect(groups[0]?.defaultOpen).toBe(true)
  })

  it('includes overdue payments in this month', () => {
    const groups = groupUpcomingPayments([expense(1, '2026-06-20', 75)], '2026-07-15')
    expect(groups).toHaveLength(1)
    expect(groups[0]?.id).toBe('thisMonth')
    expect(groups[0]?.totalAmount).toBe(75)
  })
})

describe('upcomingFetchDays', () => {
  it('covers through the end of next month', () => {
    // Jul 15 → Aug 31 = 47 days
    expect(upcomingFetchDays('2026-07-15')).toBe(47)
    // Nov 1 → Dec 31 = 60 days
    expect(upcomingFetchDays('2026-11-01')).toBe(60)
  })
})
