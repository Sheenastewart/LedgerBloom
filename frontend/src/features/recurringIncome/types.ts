import type { IncomeEntry } from '../income/types'

export type RecurringIncomeCadence =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUAL'
  | 'ANNUAL'
  | 'SEMIMONTHLY'

export type RecurringIncomeHistoryMode = 'TRACK_FROM_NOW' | 'RECORD_SELECTED'

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
  firstPaymentDay?: number | null
  secondPaymentDay?: number | null
}

export type RecurringIncomeWriteRequest = {
  description: string
  source: string
  amount: number
  cadence: RecurringIncomeCadence
  nextIncomeDate: string
  active: boolean
  notes: string | null
  firstPaymentDay?: number | null
  secondPaymentDay?: number | null
}

/** Extends the base write request with create-only historical catch-up choices. */
export type RecurringIncomeCreateRequest = RecurringIncomeWriteRequest & {
  historyMode?: RecurringIncomeHistoryMode | null
  selectedOccurrenceDates?: string[] | null
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
  firstPaymentDay: string
  secondPaymentDay: string
  historyMode: '' | RecurringIncomeHistoryMode
  selectedOccurrenceDates: string[]
}

export type RecurringIncomeFormErrors = {
  description?: string
  source?: string
  amount?: string
  cadence?: string
  nextIncomeDate?: string
  active?: string
  notes?: string
  firstPaymentDay?: string
  secondPaymentDay?: string
  historyMode?: string
  form?: string
}

export const CADENCE_OPTIONS: { value: RecurringIncomeCadence; label: string }[] = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Biweekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'SEMIANNUAL', label: 'Semiannual' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'SEMIMONTHLY', label: 'Semimonthly' },
]

export function cadenceLabel(cadence: RecurringIncomeCadence): string {
  return CADENCE_OPTIONS.find((option) => option.value === cadence)?.label ?? cadence
}

/** Occurrence preview types mirror OccurrencePreviewResponse.java field names exactly. */
export type OccurrencePreviewItem = {
  occurrenceDate: string
  amount: number
}

export type OccurrencePreviewRequest = {
  cadence: RecurringIncomeCadence
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

export type CreatedIncomeEntrySummary = {
  id: number
  description: string
  source: string
  amount: number
  incomeDate: string
}

export type RecurringIncomeCatchUpResult = {
  createdCount: number
  createdDates: string[]
  nextOccurrenceDate: string
  updatedRecurringIncome: RecurringIncome
  createdIncomeEntries: CreatedIncomeEntrySummary[]
}
