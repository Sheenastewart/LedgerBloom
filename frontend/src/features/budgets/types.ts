export const BUDGET_GROUPS = [
  { key: 'BILLS', label: 'Bills' },
  { key: 'SUBSCRIPTIONS', label: 'Subscriptions' },
  { key: 'GROCERIES', label: 'Groceries' },
  { key: 'EATING_OUT', label: 'Eating out' },
  { key: 'TRANSPORTATION', label: 'Transportation' },
  { key: 'MEDICAL', label: 'Medical' },
  { key: 'CHILD_CARE', label: 'Child care' },
  { key: 'DEBT_PAYMENTS', label: 'Debt payments' },
  { key: 'PERSONAL_HOUSEHOLD', label: 'Personal & household' },
] as const

export type BudgetGroupKey = (typeof BUDGET_GROUPS)[number]['key']

export type BudgetGroupSummary = {
  key: string
  label: string
}

export type BudgetGroupLimit = {
  id: number
  group: BudgetGroupSummary
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
  userModified: boolean
  expenseCount: number
  groupLimits: BudgetGroupLimit[]
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

export type GroupLimitFormValues = {
  budgetGroup: string
  limitAmount: string
  assistanceAmount: string
}

export type GroupLimitFormErrors = {
  budgetGroup?: string
  limitAmount?: string
  assistanceAmount?: string
  form?: string
}

export type GroupLimitCreateRequest = {
  budgetGroup: BudgetGroupKey
  limitAmount: number
  assistanceAmount: number
}

export type GroupLimitUpdateRequest = {
  limitAmount: number
  assistanceAmount: number
}

export type BudgetGroupRestoreDefaultsResult = {
  budget: MonthlyBudget
  restored: BudgetGroupSummary[]
  skipped: BudgetGroupSummary[]
}

export type BudgetStatus = 'on-track' | 'near-budget' | 'over-budget'
