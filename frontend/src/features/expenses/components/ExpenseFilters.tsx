import { useState } from 'react'
import type { Category } from '../../categories/types'
import type { ExpenseFilterDraft, ExpenseFilters } from '../types'

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

type ExpenseFiltersProps = {
  categories: Category[]
  appliedFilters: ExpenseFilters
  onApply: (filters: ExpenseFilters) => void
  onClear: () => void
}

export type ExpenseFilterErrors = {
  month?: string
  year?: string
  form?: string
}

function filtersToDraft(appliedFilters: ExpenseFilters): ExpenseFilterDraft {
  return {
    month: appliedFilters.month !== undefined ? String(appliedFilters.month) : '',
    year: appliedFilters.year !== undefined ? String(appliedFilters.year) : '',
    categoryId:
      appliedFilters.categoryId !== undefined ? String(appliedFilters.categoryId) : '',
  }
}

function validateDraft(draft: ExpenseFilterDraft): {
  errors: ExpenseFilterErrors
  filters: ExpenseFilters | null
} {
  const errors: ExpenseFilterErrors = {}
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

  let categoryId: number | undefined
  if (draft.categoryId.trim() !== '') {
    const parsedCategoryId = Number(draft.categoryId)
    if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
      errors.form = 'Select a valid category.'
    } else {
      categoryId = parsedCategoryId
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors, filters: null }
  }

  const filters: ExpenseFilters = {}
  if (year !== undefined && month !== undefined) {
    filters.year = year
    filters.month = month
  }
  if (categoryId !== undefined) {
    filters.categoryId = categoryId
  }

  return { errors, filters }
}

export function ExpenseFilters({
  categories,
  appliedFilters,
  onApply,
  onClear,
}: ExpenseFiltersProps) {
  const [draft, setDraft] = useState<ExpenseFilterDraft>(() => filtersToDraft(appliedFilters))
  const [errors, setErrors] = useState<ExpenseFilterErrors>({})

  function handleApply() {
    const result = validateDraft(draft)
    setErrors(result.errors)
    if (result.filters === null) {
      return
    }
    onApply(result.filters)
  }

  function handleClear() {
    setDraft({ month: '', year: '', categoryId: '' })
    setErrors({})
    onClear()
  }

  const monthError = errors.month
  const yearError = errors.year
  const formError = errors.form

  return (
    <fieldset className="expense-filters">
      <legend>Filter expenses</legend>

      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="expense-filters-grid">
        <div className="field">
          <label htmlFor="expense-filter-month">Month</label>
          <select
            id="expense-filter-month"
            value={draft.month}
            onChange={(event) => setDraft((current) => ({ ...current, month: event.target.value }))}
            aria-invalid={monthError ? true : undefined}
            aria-describedby={monthError ? 'expense-filter-month-error' : undefined}
          >
            <option value="">Any month</option>
            {MONTH_OPTIONS.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
          {monthError ? (
            <p id="expense-filter-month-error" className="field-error" role="alert">
              {monthError}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="expense-filter-year">Year</label>
          <input
            id="expense-filter-year"
            type="number"
            min={1}
            max={9999}
            value={draft.year}
            onChange={(event) => setDraft((current) => ({ ...current, year: event.target.value }))}
            aria-invalid={yearError ? true : undefined}
            aria-describedby={yearError ? 'expense-filter-year-error' : undefined}
            placeholder="Any year"
          />
          {yearError ? (
            <p id="expense-filter-year-error" className="field-error" role="alert">
              {yearError}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="expense-filter-category">Category</label>
          <select
            id="expense-filter-category"
            value={draft.categoryId}
            onChange={(event) =>
              setDraft((current) => ({ ...current, categoryId: event.target.value }))
            }
          >
            <option value="">Any category</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="expense-filters-actions">
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

export { validateDraft as validateExpenseFilterDraft }
