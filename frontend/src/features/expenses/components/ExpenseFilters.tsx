import { useState } from 'react'
import type { Category } from '../../categories/types'
import {
  isLedgerFilterActive,
  type LedgerFilterScope,
} from '../../../utils/ledgerPageFilter'
import {
  currentPeriodValues,
  FILTER_YEAR_MAX,
  FILTER_YEAR_MIN,
  MONTH_OPTIONS,
  YEAR_OPTIONS,
} from '../../../utils/periodFilterOptions'
import type { ExpenseFilterDraft, ExpenseFilters } from '../types'

export type ExpensePageFilters = ExpenseFilters & {
  scope: LedgerFilterScope
}

type ExpenseFiltersProps = {
  categories: Category[]
  appliedFilters: ExpensePageFilters
  onApply: (filters: ExpensePageFilters) => void
  onClear: () => void
}

export type ExpenseFilterErrors = {
  month?: string
  year?: string
  form?: string
}

type ExpensePageFilterDraft = ExpenseFilterDraft & {
  scope: string
}

function filtersToDraft(appliedFilters: ExpensePageFilters): ExpensePageFilterDraft {
  const current = currentPeriodValues()
  return {
    scope: appliedFilters.scope ?? 'all',
    month: appliedFilters.month !== undefined ? String(appliedFilters.month) : current.month,
    year: appliedFilters.year !== undefined ? String(appliedFilters.year) : current.year,
    categoryId:
      appliedFilters.categoryId !== undefined ? String(appliedFilters.categoryId) : '',
  }
}

function validateDraft(draft: ExpensePageFilterDraft): {
  errors: ExpenseFilterErrors
  filters: ExpensePageFilters | null
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

    if (!Number.isInteger(year) || year < FILTER_YEAR_MIN || year > FILTER_YEAR_MAX) {
      errors.year = `Select a year between ${FILTER_YEAR_MIN} and ${FILTER_YEAR_MAX}.`
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

  const scope = (draft.scope || 'all') as LedgerFilterScope
  if (!['all', 'recorded', 'upcoming', 'schedules'].includes(scope)) {
    errors.form = 'Select a valid section to filter.'
  }

  if (Object.keys(errors).length > 0) {
    return { errors, filters: null }
  }

  const filters: ExpensePageFilters = { scope }
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
  const [draft, setDraft] = useState<ExpensePageFilterDraft>(() => filtersToDraft(appliedFilters))
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
    const current = currentPeriodValues()
    setDraft({ scope: 'all', month: current.month, year: current.year, categoryId: '' })
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
        <span className="page-filter__hint">Looking at, month, year, category</span>
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
            <label htmlFor="expense-filter-scope">Looking at</label>
            <select
              id="expense-filter-scope"
              value={draft.scope}
              onChange={(event) => setDraft((current) => ({ ...current, scope: event.target.value }))}
            >
              <option value="all">Everything</option>
              <option value="recorded">Paid expenses</option>
              <option value="upcoming">Remaining expenses</option>
              <option value="schedules">All recurring expenses</option>
            </select>
          </div>

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
            <select
              id="expense-filter-year"
              value={draft.year}
              onChange={(event) => setDraft((current) => ({ ...current, year: event.target.value }))}
              aria-invalid={yearError ? true : undefined}
              aria-describedby={yearError ? 'expense-filter-year-error' : undefined}
            >
              <option value="">Any year</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
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

export { validateDraft as validateExpenseFilterDraft }
