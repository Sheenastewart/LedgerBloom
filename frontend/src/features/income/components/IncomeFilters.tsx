import { useState } from 'react'
import {
  isLedgerFilterActive,
  type LedgerFilterScope,
} from '../../../utils/ledgerPageFilter'
import type { IncomeFilterDraft, IncomeFilters } from '../types'

const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
] as const

export type IncomePageFilters = IncomeFilters & {
  scope: LedgerFilterScope
}

type IncomeFiltersProps = {
  appliedFilters: IncomePageFilters
  onApply: (filters: IncomePageFilters) => void
  onClear: () => void
}

export type IncomeFilterErrors = {
  month?: string
  year?: string
  form?: string
}

type IncomePageFilterDraft = IncomeFilterDraft & {
  scope: string
}

function filtersToDraft(appliedFilters: IncomePageFilters): IncomePageFilterDraft {
  return {
    scope: appliedFilters.scope ?? 'all',
    month: appliedFilters.month !== undefined ? String(appliedFilters.month) : '',
    year: appliedFilters.year !== undefined ? String(appliedFilters.year) : '',
    source: appliedFilters.source !== undefined ? appliedFilters.source : '',
  }
}

function validateDraft(draft: IncomePageFilterDraft): {
  errors: IncomeFilterErrors
  filters: IncomePageFilters | null
} {
  const errors: IncomeFilterErrors = {}
  const hasMonth = draft.month.trim() !== ''
  const hasYear = draft.year.trim() !== ''

  if (hasMonth !== hasYear) {
    errors.form = 'Select both month and year, or leave both empty.'
  }

  let year: number | undefined
  let month: number | undefined

  if (hasMonth && hasYear) {
    month = Number(draft.month)
    year = Number(draft.year)

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      errors.month = 'Month must be between 1 and 12.'
    }

    if (!Number.isInteger(year) || year < 1 || year > 9999) {
      errors.year = 'Enter a valid year between 1 and 9999.'
    }
  }

  const trimmedSource = draft.source.trim()
  const source = trimmedSource.length > 0 ? trimmedSource : undefined

  const scope = (draft.scope || 'all') as LedgerFilterScope
  if (!['all', 'recorded', 'upcoming', 'schedules'].includes(scope)) {
    errors.form = 'Select a valid section to filter.'
  }

  if (Object.keys(errors).length > 0) {
    return { errors, filters: null }
  }

  const filters: IncomePageFilters = { scope }
  if (year !== undefined && month !== undefined) {
    filters.year = year
    filters.month = month
  }
  if (source !== undefined) {
    filters.source = source
  }

  return { errors, filters }
}

export function IncomeFilters({ appliedFilters, onApply, onClear }: IncomeFiltersProps) {
  const [draft, setDraft] = useState<IncomePageFilterDraft>(() => filtersToDraft(appliedFilters))
  const [errors, setErrors] = useState<IncomeFilterErrors>({})

  function handleApply() {
    const result = validateDraft(draft)
    setErrors(result.errors)
    if (result.filters === null) {
      return
    }
    onApply(result.filters)
  }

  function handleClear() {
    setDraft({ scope: 'all', month: '', year: '', source: '' })
    setErrors({})
    onClear()
  }

  const monthError = errors.month
  const yearError = errors.year
  const formError = errors.form
  const active = isLedgerFilterActive(appliedFilters)

  return (
    <details className="page-filter">
      <summary className="page-filter__summary">
        <span className="page-filter__title">Filter</span>
        <span className="page-filter__hint">Looking at, month, year, source</span>
        {active ? <span className="page-filter__badge">On</span> : null}
      </summary>

      <div className="page-filter__body">
        {formError ? (
          <p className="form-error" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="page-filter__grid">
          <div className="field">
            <label htmlFor="income-filter-scope">Looking at</label>
            <select
              id="income-filter-scope"
              value={draft.scope}
              onChange={(event) => setDraft((current) => ({ ...current, scope: event.target.value }))}
            >
              <option value="all">Everything</option>
              <option value="recorded">Received income</option>
              <option value="upcoming">Expected income</option>
              <option value="schedules">All recurring income</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="income-filter-month">Month</label>
            <select
              id="income-filter-month"
              value={draft.month}
              onChange={(event) => setDraft((current) => ({ ...current, month: event.target.value }))}
              aria-invalid={monthError ? true : undefined}
              aria-describedby={monthError ? 'income-filter-month-error' : undefined}
            >
              <option value="">Any month</option>
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            {monthError ? (
              <p id="income-filter-month-error" className="field-error" role="alert">
                {monthError}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="income-filter-year">Year</label>
            <input
              id="income-filter-year"
              type="number"
              min={1}
              max={9999}
              value={draft.year}
              onChange={(event) => setDraft((current) => ({ ...current, year: event.target.value }))}
              aria-invalid={yearError ? true : undefined}
              aria-describedby={yearError ? 'income-filter-year-error' : undefined}
              placeholder="Any year"
            />
            {yearError ? (
              <p id="income-filter-year-error" className="field-error" role="alert">
                {yearError}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="income-filter-source">Source</label>
            <input
              id="income-filter-source"
              type="text"
              value={draft.source}
              onChange={(event) =>
                setDraft((current) => ({ ...current, source: event.target.value }))
              }
              placeholder="Employer, bank…"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="page-filter__actions">
          <button type="button" className="button button-primary" onClick={handleApply}>
            Apply
          </button>
          <button type="button" className="button button-secondary" onClick={handleClear}>
            Clear
          </button>
        </div>
      </div>
    </details>
  )
}

export { validateDraft as validateIncomeFilterDraft }
