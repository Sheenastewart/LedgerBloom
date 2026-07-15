import { useState, type FormEvent } from 'react'
import type { Category } from '../../categories/types'
import { CADENCE_OPTIONS, type RecurringFilterDraft, type RecurringFilters } from '../types'

type RecurringFiltersProps = {
  categories: Category[]
  appliedFilters: RecurringFilters
  onApply: (filters: RecurringFilters) => void
  onClear: () => void
}

function filtersToDraft(filters: RecurringFilters): RecurringFilterDraft {
  return {
    active:
      filters.active === undefined ? '' : filters.active ? 'true' : 'false',
    categoryId: filters.categoryId === undefined ? '' : String(filters.categoryId),
    cadence: filters.cadence ?? '',
  }
}

export function RecurringFilters({
  categories,
  appliedFilters,
  onApply,
  onClear,
}: RecurringFiltersProps) {
  const [draft, setDraft] = useState<RecurringFilterDraft>(() => filtersToDraft(appliedFilters))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: RecurringFilters = {}
    if (draft.active === 'true') {
      next.active = true
    } else if (draft.active === 'false') {
      next.active = false
    }
    if (draft.categoryId.trim()) {
      next.categoryId = Number(draft.categoryId)
    }
    if (draft.cadence.trim()) {
      next.cadence = draft.cadence as RecurringFilters['cadence']
    }
    onApply(next)
  }

  function handleClear() {
    setDraft({ active: '', categoryId: '', cadence: '' })
    onClear()
  }

  return (
    <form className="dashboard-period" onSubmit={handleSubmit} noValidate>
      <fieldset>
        <legend>Filters</legend>
        <div className="dashboard-period-grid">
          <div className="field">
            <label htmlFor="recurring-filter-active">Status</label>
            <select
              id="recurring-filter-active"
              value={draft.active}
              onChange={(event) => setDraft((current) => ({ ...current, active: event.target.value }))}
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="recurring-filter-category">Category</label>
            <select
              id="recurring-filter-category"
              value={draft.categoryId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, categoryId: event.target.value }))
              }
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="recurring-filter-cadence">Cadence</label>
            <select
              id="recurring-filter-cadence"
              value={draft.cadence}
              onChange={(event) => setDraft((current) => ({ ...current, cadence: event.target.value }))}
            >
              <option value="">All cadences</option>
              {CADENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="dashboard-period-actions">
          <button type="submit" className="button button-primary">
            Apply filters
          </button>
          <button type="button" className="button button-secondary" onClick={handleClear}>
            Clear
          </button>
        </div>
      </fieldset>
    </form>
  )
}
