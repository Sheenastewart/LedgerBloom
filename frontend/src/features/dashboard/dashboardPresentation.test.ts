import { describe, expect, it } from 'vitest'
import {
  activityItemsToRows,
  buildAgenda,
  mergeRecentActivity,
  safeToSpend,
} from './dashboardPresentation'

describe('dashboardPresentation', () => {
  it('merges activity and maps to activity rows', () => {
    const items = mergeRecentActivity(
      [
        {
          id: 1,
          description: null,
          merchant: 'Market',
          amount: 40,
          expenseDate: '2026-07-12',
          category: { name: 'Groceries' },
        },
      ],
      [
        {
          id: 2,
          description: 'Pay',
          amount: 100,
          incomeDate: '2026-07-13',
          source: 'Job',
          recurringIncomeId: 9,
        },
      ],
      5,
    )
    expect(items[0]?.description).toBe('Pay')
    expect(items[1]?.description).toBe('Groceries')
    const rows = activityItemsToRows(items)
    expect(rows[0]?.recurring).toBe(true)
    expect(rows[1]?.merchant).toBe('Market')
  })

  it('builds agenda groups and safe-to-spend', () => {
    const agenda = buildAgenda({
      todayIso: '2026-07-15',
      expenseItems: [
        {
          id: 1,
          description: 'Rent',
          categoryName: 'Housing',
          amount: 100,
          nextPaymentDate: '2026-07-14',
        },
        {
          id: 2,
          description: 'Power',
          categoryName: 'Utilities',
          amount: 50,
          nextPaymentDate: '2026-07-16',
        },
      ],
      incomeItems: [
        {
          id: 3,
          description: 'Pay',
          source: 'Job',
          amount: 200,
          nextIncomeDate: '2026-07-15',
        },
      ],
    })
    expect(agenda.find((item) => item.id.includes('exp-1'))?.group).toBe('overdue')
    expect(agenda.find((item) => item.id.includes('inc-3'))?.group).toBe('today')
    expect(agenda.find((item) => item.id.includes('exp-2'))?.group).toBe('tomorrow')
    expect(safeToSpend(500, 120)).toBe(380)
    expect(safeToSpend(null, 120)).toBeNull()
  })
})
