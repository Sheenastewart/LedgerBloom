import type { CategorySpendingTotal, SourceIncomeTotal } from '../dashboard/types'

export type MonthlyComparisonItem = {
  year: number
  month: number
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  incomeCount: number
  expenseCount: number
  budgetLimit: number | null
  remainingBudget: number | null
  budgetPercentUsed: number | null
  overBudget: boolean | null
  expectedRecurringIncome: number
  expectedRecurringExpenses: number
  projectedCashFlow: number
}

export type MonthlyComparisonResponse = {
  startYear: number
  startMonth: number
  endYear: number
  endMonth: number
  monthCount: number
  months: MonthlyComparisonItem[]
}

export type MonthMetricSummary = {
  year: number
  month: number
  value: number
}

export type YearToDateTotals = {
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
}

export type YearToDateAverages = {
  averageIncome: number
  averageExpenses: number
  averageNetCashFlow: number
}

export type YearToDateResponse = {
  year: number
  totals: YearToDateTotals
  averages: YearToDateAverages
  highestIncomeMonth: MonthMetricSummary | null
  highestExpenseMonth: MonthMetricSummary | null
  bestNetCashFlowMonth: MonthMetricSummary | null
  worstNetCashFlowMonth: MonthMetricSummary | null
  totalBudgeted: number
  totalBudgetRemaining: number
  monthsOverBudget: number
  spendingByCategory: CategorySpendingTotal[]
  incomeBySource: SourceIncomeTotal[]
  monthSummaries: MonthlyComparisonItem[]
}

export type MonthRange = {
  startYear: number
  startMonth: number
  endYear: number
  endMonth: number
}

export type MonthRangeDraft = {
  startYear: string
  startMonth: string
  endYear: string
  endMonth: string
}

export type MonthPeriod = {
  year: number
  month: number
}
