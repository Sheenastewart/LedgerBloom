export type BudgetCategorySummary = {
  id: number
  name: string
}

export type CategoryBudgetLimit = {
  id: number
  category: BudgetCategorySummary
  limitAmount: number
  assistanceAmount: number
  actualSpent: number
  budgetableSpent: number
  remaining: number
  percentUsed: number
  overBudget: boolean
}

export type MonthlyBudget = {
  id: number
  year: number
  month: number
  totalLimit: number
  actualExpenses: number
  budgetableExpenses: number
  assistanceApplied: number
  remaining: number
  percentUsed: number
  overBudget: boolean
  expenseCount: number
  categoryLimits: CategoryBudgetLimit[]
  createdAt: string
  updatedAt: string
}

export type BudgetPeriod = {
  year: number
  month: number
}

export type BudgetPeriodDraft = {
  month: string
  year: string
}

export type MonthlyBudgetFormValues = {
  year: string
  month: string
  totalLimit: string
}

export type MonthlyBudgetFormErrors = {
  year?: string
  month?: string
  totalLimit?: string
  form?: string
}

export type MonthlyBudgetWriteRequest = {
  year: number
  month: number
  totalLimit: number
}

export type MonthlyBudgetUpdateRequest = {
  totalLimit: number
}

export type CategoryLimitFormValues = {
  categoryId: string
  limitAmount: string
  assistanceAmount: string
}

export type CategoryLimitFormErrors = {
  categoryId?: string
  limitAmount?: string
  assistanceAmount?: string
  form?: string
}

export type CategoryLimitCreateRequest = {
  categoryId: number
  limitAmount: number
  assistanceAmount: number
}

export type CategoryLimitUpdateRequest = {
  limitAmount: number
  assistanceAmount: number
}

export type BudgetStatus = 'on-track' | 'near-budget' | 'over-budget'
