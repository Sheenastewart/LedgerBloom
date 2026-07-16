import { useState, type FormEvent } from 'react'
import { CADENCE_OPTIONS, type RecurringIncomeFilterDraft, type RecurringIncomeFilters } from '../types'

type RecurringIncomeFiltersProps = {
  appliedFilters: RecurringIncomeFilters
  onApply: (filters: RecurringIncomeFilters) => void
  onClear: () => void
}

function filtersToDraft(filters: RecurringIncomeFilters): RecurringIncomeFilterDraft {
  return {
    active: filters.active === undefined ? '' : filters.active ? 'true' : 'false',
    cadence: filters.cadence ?? '',
    source: filters.source ?? '',
  }
}

export function RecurringIncomeFilters({
  appliedFilters,
  onApply,
  onClear,
}: RecurringIncomeFiltersProps) {
  const [draft, setDraft] = useState<RecurringIncomeFilterDraft>(() =>
    filtersToDraft(appliedFilters),
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: RecurringIncomeFilters = {}
    if (draft.active === 'true') {
      next.active = true
    } else if (draft.active === 'false') {
      next.active = false
    }
    if (draft.cadence.trim()) {
      next.cadence = draft.cadence as RecurringIncomeFilters['cadence']
    }
    const trimmedSource = draft.source.trim()
    if (trimmedSource) {
      next.source = trimmedSource
    }
    onApply(next)
  }

  function handleClear() {
    setDraft({ active: '', cadence: '', source: '' })
    onClear()
  }

  return (
    <form className="recurring-filters" onSubmit={handleSubmit} noValidate>
      <fieldset>
        <legend>Filter schedules</legend>
        <div className="recurring-filters-grid">
          <div className="field">
            <label htmlFor="recurring-income-filter-active">Status</label>
            <select
              id="recurring-income-filter-active"
              value={draft.active}
              onChange={(event) =>
                setDraft((current) => ({ ...current, active: event.target.value }))
              }
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="recurring-income-filter-cadence">Cadence</label>
            <select
              id="recurring-income-filter-cadence"
              value={draft.cadence}
              onChange={(event) =>
                setDraft((current) => ({ ...current, cadence: event.target.value }))
              }
            >
              <option value="">All cadences</option>
              {CADENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="recurring-income-filter-source">Source</label>
            <input
              id="recurring-income-filter-source"
              type="text"
              value={draft.source}
              placeholder="Employer, bank…"
              onChange={(event) =>
                setDraft((current) => ({ ...current, source: event.target.value }))
              }
            />
          </div>
        </div>
        <div className="recurring-filters-actions">
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
