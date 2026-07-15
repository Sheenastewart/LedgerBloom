export type ExpenseCategoryRef = {
  id: number
  name: string
}

export type Expense = {
  id: number
  description: string
  merchant: string | null
  amount: number
  expenseDate: string
  category: ExpenseCategoryRef
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type ExpenseWriteRequest = {
  description: string
  merchant: string | null
  amount: number
  expenseDate: string
  categoryId: number
  notes: string | null
}

export type ExpenseFilters = {
  year?: number
  month?: number
  categoryId?: number
}

export type ExpenseFilterDraft = {
  month: string
  year: string
  categoryId: string
}

export type ExpenseFormValues = {
  description: string
  merchant: string
  amount: string
  expenseDate: string
  categoryId: string
  notes: string
}

export type ExpenseFormErrors = {
  description?: string
  merchant?: string
  amount?: string
  expenseDate?: string
  categoryId?: string
  notes?: string
  form?: string
}
