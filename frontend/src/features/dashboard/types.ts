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
  description: string | null
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

export type DashboardBudgetSummary = {
  id: number
  totalLimit: number
  actualExpenses: number
  remaining: number
  percentUsed: number
  overBudget: boolean
}

export type DashboardCashFlowPlanning = {
  expectedIncome: number
  expectedExpenses: number
  projectedCashFlow: number
  upcomingIncomeCount: number
  upcomingExpenseCount: number
  upcomingIncomeItems: DashboardUpcomingIncomeItem[]
  upcomingExpenseItems: DashboardUpcomingExpenseItem[]
}

export type DashboardUpcomingIncomeItem = {
  id: number
  description: string
  source: string
  amount: number
  nextIncomeDate: string
  cadence: string
}

export type DashboardUpcomingExpenseItem = {
  id: number
  description: string | null
  categoryName: string
  amount: number
  nextPaymentDate: string
  cadence: string
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
  budget: DashboardBudgetSummary | null
  planning: DashboardCashFlowPlanning
}

export type DashboardPeriod = {
  year: number
  month: number
}

export type DashboardPeriodDraft = {
  month: string
  year: string
}
