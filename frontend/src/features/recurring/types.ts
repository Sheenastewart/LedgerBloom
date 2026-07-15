export type RecurringCadence =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUAL'
  | 'ANNUAL'

export type RecurringCategoryRef = {
  id: number
  name: string
}

export type RecurringExpense = {
  id: number
  description: string
  merchant: string | null
  amount: number
  category: RecurringCategoryRef
  cadence: RecurringCadence
  nextPaymentDate: string
  active: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type RecurringWriteRequest = {
  description: string
  merchant: string | null
  amount: number
  categoryId: number
  cadence: RecurringCadence
  nextPaymentDate: string
  active: boolean
  notes: string | null
}

export type MarkPaidRequest = {
  expectedNextPaymentDate: string
}

export type MarkPaidResult = {
  createdExpense: {
    id: number
    description: string
    amount: number
    expenseDate: string
  }
  updatedRecurringExpense: RecurringExpense
}

export type RecurringFilters = {
  active?: boolean
  categoryId?: number
  cadence?: RecurringCadence
}

export type RecurringFilterDraft = {
  active: string
  categoryId: string
  cadence: string
}

export type RecurringFormValues = {
  description: string
  merchant: string
  amount: string
  categoryId: string
  cadence: string
  nextPaymentDate: string
  active: boolean
  notes: string
}

export type RecurringFormErrors = {
  description?: string
  merchant?: string
  amount?: string
  categoryId?: string
  cadence?: string
  nextPaymentDate?: string
  active?: string
  notes?: string
  form?: string
}

export const CADENCE_OPTIONS: { value: RecurringCadence; label: string }[] = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Every 2 weeks' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'SEMIANNUAL', label: 'Every 6 months' },
  { value: 'ANNUAL', label: 'Annual' },
]

export function cadenceLabel(cadence: RecurringCadence): string {
  return CADENCE_OPTIONS.find((option) => option.value === cadence)?.label ?? cadence
}
