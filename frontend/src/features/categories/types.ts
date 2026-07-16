import type { FieldErrorDetail } from '../../api/ApiClientError'
import type { BudgetGroupKey } from '../budgets/types'

export type Category = {
  id: number
  name: string
  description: string | null
  color: string | null
  budgetGroup?: BudgetGroupKey
  budgetGroupLabel?: string
  createdAt: string
  updatedAt: string
}

export type CategoryWriteRequest = {
  name: string
  description: string | null
  color: string | null
  budgetGroup: BudgetGroupKey
}

export type StarterCategoriesResult = {
  createdCount: number
  createdNames: string[]
  skippedCount: number
  skippedNames: string[]
}

export type CategoryFormValues = {
  name: string
  description: string
  color: string
  budgetGroup: string
}

export type CategoryFormErrors = {
  name?: string
  description?: string
  color?: string
  budgetGroup?: string
  form?: string
}

export type { FieldErrorDetail }
export type { BudgetGroupKey }
