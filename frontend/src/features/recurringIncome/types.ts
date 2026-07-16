import type { IncomeEntry } from '../income/types'

export type RecurringIncomeCadence =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUAL'
  | 'ANNUAL'

export type RecurringIncome = {
  id: number
  description: string
  source: string
  amount: number
  cadence: RecurringIncomeCadence
  nextIncomeDate: string
  active: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type RecurringIncomeWriteRequest = {
  description: string
  source: string
  amount: number
  cadence: RecurringIncomeCadence
  nextIncomeDate: string
  active: boolean
  notes: string | null
}

export type MarkReceivedRequest = {
  expectedNextIncomeDate: string
}

export type MarkReceivedResult = {
  createdIncomeEntry: IncomeEntry
  updatedRecurringIncome: RecurringIncome
}

export type RecurringIncomeFilters = {
  active?: boolean
  cadence?: RecurringIncomeCadence
  source?: string
}

export type RecurringIncomeFilterDraft = {
  active: string
  cadence: string
  source: string
}

export type RecurringIncomeFormValues = {
  description: string
  source: string
  amount: string
  cadence: string
  nextIncomeDate: string
  active: boolean
  notes: string
}

export type RecurringIncomeFormErrors = {
  description?: string
  source?: string
  amount?: string
  cadence?: string
  nextIncomeDate?: string
  active?: string
  notes?: string
  form?: string
}

export const CADENCE_OPTIONS: { value: RecurringIncomeCadence; label: string }[] = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Biweekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'SEMIANNUAL', label: 'Semiannual' },
  { value: 'ANNUAL', label: 'Annual' },
]

export function cadenceLabel(cadence: RecurringIncomeCadence): string {
  return CADENCE_OPTIONS.find((option) => option.value === cadence)?.label ?? cadence
}
