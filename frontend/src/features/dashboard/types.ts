export type CategorySpendingTotal = {
  categoryId: number
  categoryName: string
  total: number
  entryCount: number
}

export type SourceIncomeTotal = {
  source: string
  total: number
  entryCount: number
}

export type LargestExpenseSummary = {
  id: number
  description: string
  amount: number
  expenseDate: string
  categoryName: string
}

export type LargestIncomeSummary = {
  id: number
  description: string
  amount: number
  incomeDate: string
  source: string
}

export type MonthlyDashboard = {
  year: number
  month: number
  totalIncome: number
  totalExpenses: number
  netCashFlow: number
  incomeEntryCount: number
  expenseEntryCount: number
  spendingByCategory: CategorySpendingTotal[]
  incomeBySource: SourceIncomeTotal[]
  largestExpense: LargestExpenseSummary | null
  largestIncome: LargestIncomeSummary | null
}

export type DashboardPeriod = {
  year: number
  month: number
}

export type DashboardPeriodDraft = {
  month: string
  year: string
}
