import { describe, expect, it } from 'vitest'
import {
  addDaysIso,
  greetingForNow,
  isWithinNextDays,
  mergeRecentActivity,
} from './dashboardPresentation'

describe('dashboardPresentation', () => {
  it('returns time-of-day greetings', () => {
    expect(greetingForNow(new Date('2026-07-15T08:00:00'))).toBe('Good morning')
    expect(greetingForNow(new Date('2026-07-15T13:00:00'))).toBe('Good afternoon')
    expect(greetingForNow(new Date('2026-07-15T19:00:00'))).toBe('Good evening')
  })

  it('detects dates within the next N days', () => {
    expect(isWithinNextDays('2026-07-16', '2026-07-15', 7)).toBe(true)
    expect(isWithinNextDays('2026-07-30', '2026-07-15', 7)).toBe(false)
    expect(addDaysIso('2026-07-15', 2)).toBe('2026-07-17')
  })

  it('merges and sorts recent activity newest first', () => {
    const items = mergeRecentActivity(
      [
        {
          id: 1,
          description: 'Old expense',
          amount: 10,
          expenseDate: '2026-07-01',
          category: { name: 'Food' },
        },
      ],
      [
        {
          id: 2,
          description: 'New income',
          amount: 20,
          incomeDate: '2026-07-10',
          source: 'Job',
        },
      ],
      5,
    )
    expect(items).toHaveLength(2)
    expect(items[0]?.description).toBe('New income')
    expect(items[1]?.description).toBe('Old expense')
  })
})
