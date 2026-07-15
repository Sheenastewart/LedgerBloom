import { useState } from 'react'
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

type IncomeFiltersProps = {
  appliedFilters: IncomeFilters
  onApply: (filters: IncomeFilters) => void
  onClear: () => void
}

export type IncomeFilterErrors = {
  month?: string
  year?: string
  form?: string
}

function filtersToDraft(appliedFilters: IncomeFilters): IncomeFilterDraft {
  return {
    month: appliedFilters.month !== undefined ? String(appliedFilters.month) : '',
    year: appliedFilters.year !== undefined ? String(appliedFilters.year) : '',
    source: appliedFilters.source !== undefined ? appliedFilters.source : '',
  }
}

function validateDraft(draft: IncomeFilterDraft): {
  errors: IncomeFilterErrors
  filters: IncomeFilters | null
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

  if (Object.keys(errors).length > 0) {
    return { errors, filters: null }
  }

  const filters: IncomeFilters = {}
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
  const [draft, setDraft] = useState<IncomeFilterDraft>(() => filtersToDraft(appliedFilters))
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
    setDraft({ month: '', year: '', source: '' })
    setErrors({})
    onClear()
  }

  const monthError = errors.month
  const yearError = errors.year
  const formError = errors.form

  return (
    <fieldset className="income-filters">
      <legend>Filter income</legend>

      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="income-filters-grid">
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
            placeholder="Any source"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="income-filters-actions">
        <button type="button" className="button button-primary" onClick={handleApply}>
          Apply
        </button>
        <button type="button" className="button button-secondary" onClick={handleClear}>
          Clear
        </button>
      </div>
    </fieldset>
  )
}

export { validateDraft as validateIncomeFilterDraft }
