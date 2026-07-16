export type RecurringCadence =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUAL'
  | 'ANNUAL'
  | 'SEMIMONTHLY'

export type RecurringHistoryMode = 'TRACK_FROM_NOW' | 'RECORD_SELECTED'

export type RecurringCategoryRef = {
  id: number
  name: string
}

export type RecurringExpense = {
  id: number
  description: string | null
  merchant: string | null
  amount: number
  category: RecurringCategoryRef
  cadence: RecurringCadence
  nextPaymentDate: string
  active: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
  firstPaymentDay?: number | null
  secondPaymentDay?: number | null
}

export type RecurringWriteRequest = {
  description: string | null
  merchant: string | null
  amount: number
  categoryId: number
  cadence: RecurringCadence
  nextPaymentDate: string
  active: boolean
  notes: string | null
  firstPaymentDay?: number | null
  secondPaymentDay?: number | null
}

/** Extends the base write request with create-only historical catch-up choices. */
export type RecurringCreateRequest = RecurringWriteRequest & {
  historyMode?: RecurringHistoryMode | null
  selectedOccurrenceDates?: string[] | null
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
  firstPaymentDay: string
  secondPaymentDay: string
  historyMode: '' | RecurringHistoryMode
  selectedOccurrenceDates: string[]
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
  firstPaymentDay?: string
  secondPaymentDay?: string
  historyMode?: string
  form?: string
}

export const CADENCE_OPTIONS: { value: RecurringCadence; label: string }[] = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Biweekly (every 2 weeks)' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly (every 3 months)' },
  { value: 'SEMIANNUAL', label: 'Semiannual (every 6 months)' },
  { value: 'ANNUAL', label: 'Annual (once a year)' },
  { value: 'SEMIMONTHLY', label: 'Semimonthly (twice a month)' },
]

export function cadenceLabel(cadence: RecurringCadence): string {
  return CADENCE_OPTIONS.find((option) => option.value === cadence)?.label ?? cadence
}

/** Occurrence preview types mirror OccurrencePreviewResponse.java field names exactly. */
export type OccurrencePreviewItem = {
  occurrenceDate: string
  amount: number
}

export type OccurrencePreviewRequest = {
  cadence: RecurringCadence
  startDate: string
  amount: number
  firstPaymentDay?: number | null
  secondPaymentDay?: number | null
}

export type OccurrencePreviewResponse = {
  occurrences: OccurrencePreviewItem[]
  suggestedNextOnOrAfterToday: string
}

export type CatchUpRequest = {
  occurrenceDates: string[]
}

export type CreatedExpenseSummary = {
  id: number
  description: string
  amount: number
  expenseDate: string
}

export type RecurringExpenseCatchUpResult = {
  createdCount: number
  createdDates: string[]
  nextOccurrenceDate: string
  updatedRecurringExpense: RecurringExpense
  createdExpenses: CreatedExpenseSummary[]
}
