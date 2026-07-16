import { describe, expect, it } from 'vitest'
import { buildInsights, buildMonthlyReview } from './insights'
import type { MonthlyDashboard } from '../dashboard/types'

const baseDashboard: MonthlyDashboard = {
  year: 2026,
  month: 7,
  totalIncome: 3000,
  totalExpenses: 2000,
  netCashFlow: 1000,
  incomeEntryCount: 2,
  expenseEntryCount: 4,
  spendingByCategory: [
    { categoryId: 1, categoryName: 'Dining', total: 400, entryCount: 3 },
    { categoryId: 2, categoryName: 'Utilities', total: 150, entryCount: 1 },
  ],
  incomeBySource: [],
  largestExpense: {
    id: 9,
    description: 'Dinner',
    amount: 90,
    expenseDate: '2026-07-10',
    categoryName: 'Dining',
  },
  largestIncome: null,
  budget: {
    id: 1,
    totalLimit: 2500,
    actualExpenses: 2000,
    remaining: 500,
    percentUsed: 80,
    overBudget: false,
  },
  planning: {
    expectedIncome: 0,
    expectedExpenses: 0,
    projectedCashFlow: 0,
    upcomingIncomeCount: 0,
    upcomingExpenseCount: 0,
    upcomingIncomeItems: [],
    upcomingExpenseItems: [],
  },
}

describe('insights helpers', () => {
  it('builds a monthly review and proven insights', () => {
    const previous = {
      year: 2026,
      month: 6,
      totalIncome: 2800,
      totalExpenses: 2200,
      netCashFlow: 600,
      incomeCount: 2,
      expenseCount: 5,
      budgetLimit: 2500,
      remainingBudget: 300,
      budgetPercentUsed: 88,
      overBudget: false,
      expectedRecurringIncome: 0,
      expectedRecurringExpenses: 0,
      projectedCashFlow: 0,
    }
    const review = buildMonthlyReview(baseDashboard, previous)
    expect(review.saved).toBe(1000)
    expect(review.largestCategory?.categoryName).toBe('Dining')
    const insights = buildInsights({ current: baseDashboard, previous })
    expect(insights.some((item) => item.id === 'under-budget')).toBe(true)
    expect(insights.some((item) => item.id === 'expense-change')).toBe(true)
  })
})
