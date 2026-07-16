export type IncomeEntry = {
  id: number
  description: string
  source: string
  amount: number
  incomeDate: string
  notes: string | null
  createdAt: string
  updatedAt: string
  recurringIncomeId: number | null
  canUndoReceived: boolean | null
}

export type UndoReceivedResult = {
  removedIncomeEntryId: number
  occurrenceDate: string
  scheduleRestored: boolean
  nextIncomeDate: string
  recurringIncomeId: number
}

export type IncomeWriteRequest = {
  description: string
  source: string
  amount: number
  incomeDate: string
  notes: string | null
}

export type IncomeFilters = {
  year?: number
  month?: number
  source?: string
}

export type IncomeFilterDraft = {
  month: string
  year: string
  source: string
}

export type IncomeFormValues = {
  description: string
  source: string
  amount: string
  incomeDate: string
  notes: string
}

export type IncomeFormErrors = {
  description?: string
  source?: string
  amount?: string
  incomeDate?: string
  notes?: string
  form?: string
}
