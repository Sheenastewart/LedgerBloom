import type { CategorySpendingTotal, MonthlyDashboard } from '../dashboard/types'
import type { MonthlyComparisonItem } from './types'

export type Insight = {
  id: string
  tone: 'success' | 'warning' | 'info' | 'danger'
  title: string
  detail: string
}

/** Insights proven only from existing dashboard / comparison numbers — no AI. */
export function buildInsights(args: {
  current: MonthlyDashboard
  previous: MonthlyComparisonItem | null
}): Insight[] {
  const { current, previous } = args
  const insights: Insight[] = []

  if (current.budget) {
    if (!current.budget.overBudget) {
      insights.push({
        id: 'under-budget',
        tone: 'success',
        title: 'You remained under budget',
        detail: `${formatPct(current.budget.percentUsed)} of your monthly limit used, with ${formatMoney(current.budget.remaining)} remaining.`,
      })
    } else {
      insights.push({
        id: 'over-budget',
        tone: 'danger',
        title: 'You are over budget',
        detail: `Spending is ${formatMoney(Math.abs(current.budget.remaining))} over the monthly limit.`,
      })
    }
  }

  if (previous) {
    const incomeDelta = percentChange(previous.totalIncome, current.totalIncome)
    if (incomeDelta !== null && Math.abs(incomeDelta) >= 5) {
      insights.push({
        id: 'income-change',
        tone: incomeDelta > 0 ? 'success' : 'warning',
        title:
          incomeDelta > 0
            ? `Income is up ${formatPct(incomeDelta)} vs last month`
            : `Income is down ${formatPct(Math.abs(incomeDelta))} vs last month`,
        detail: `${formatMoney(previous.totalIncome)} → ${formatMoney(current.totalIncome)}.`,
      })
    }

    const expenseDelta = percentChange(previous.totalExpenses, current.totalExpenses)
    if (expenseDelta !== null && Math.abs(expenseDelta) >= 5) {
      insights.push({
        id: 'expense-change',
        tone: expenseDelta < 0 ? 'success' : 'warning',
        title:
          expenseDelta < 0
            ? `You spent ${formatPct(Math.abs(expenseDelta))} less overall`
            : `You spent ${formatPct(expenseDelta)} more overall`,
        detail: `${formatMoney(previous.totalExpenses)} → ${formatMoney(current.totalExpenses)}.`,
      })
    }
  }

  const dining = findCategory(current.spendingByCategory, /dining|restaurant|food away/i)
  const utilities = findCategory(current.spendingByCategory, /utilit|electric/i)

  if (dining && current.totalExpenses > 0) {
    const share = (dining.total / current.totalExpenses) * 100
    insights.push({
      id: 'dining-share',
      tone: 'info',
      title: `Dining is ${formatPct(share)} of spending`,
      detail: `${formatMoney(dining.total)} across ${dining.entryCount} ${dining.entryCount === 1 ? 'entry' : 'entries'}.`,
    })
  }

  if (utilities && previous) {
    // Previous comparison does not include category breakdown — compare to this month's share only as info.
    insights.push({
      id: 'utilities-level',
      tone: 'info',
      title: `Utilities total ${formatMoney(utilities.total)}`,
      detail: `${utilities.entryCount} ${utilities.entryCount === 1 ? 'charge' : 'charges'} this month.`,
    })
  }

  if (current.largestExpense) {
    insights.push({
      id: 'largest-purchase',
      tone: 'info',
      title: 'Largest purchase this month',
      detail: `${current.largestExpense.description ?? current.largestExpense.categoryName} · ${formatMoney(current.largestExpense.amount)} (${current.largestExpense.categoryName}).`,
    })
  }

  return insights.slice(0, 6)
}

export type MonthlyReviewSummary = {
  income: number
  expenses: number
  saved: number
  largestCategory: CategorySpendingTotal | null
  largestPurchaseLabel: string | null
  largestPurchaseAmount: number | null
  previousIncome: number | null
  previousExpenses: number | null
  previousSaved: number | null
}

export function buildMonthlyReview(
  current: MonthlyDashboard,
  previous: MonthlyComparisonItem | null,
): MonthlyReviewSummary {
  const largestCategory =
    [...current.spendingByCategory].sort((a, b) => b.total - a.total)[0] ?? null
  return {
    income: current.totalIncome,
    expenses: current.totalExpenses,
    saved: current.totalIncome - current.totalExpenses,
    largestCategory,
    largestPurchaseLabel: current.largestExpense
      ? current.largestExpense.description ?? current.largestExpense.categoryName
      : null,
    largestPurchaseAmount: current.largestExpense?.amount ?? null,
    previousIncome: previous?.totalIncome ?? null,
    previousExpenses: previous?.totalExpenses ?? null,
    previousSaved: previous ? previous.totalIncome - previous.totalExpenses : null,
  }
}

function findCategory(rows: CategorySpendingTotal[], pattern: RegExp) {
  return rows.find((row) => pattern.test(row.categoryName)) ?? null
}

function percentChange(previous: number, current: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value)
}

function formatPct(value: number): string {
  return `${Math.round(value)}%`
}
