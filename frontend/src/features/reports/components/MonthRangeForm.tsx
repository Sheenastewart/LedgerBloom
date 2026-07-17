import { useState, type FormEvent } from 'react'
import {
  FILTER_YEAR_MAX,
  FILTER_YEAR_MIN,
  MONTH_OPTIONS,
  YEAR_OPTIONS,
} from '../../../utils/periodFilterOptions'
import { monthIndex, rangeMonthCount } from '../reportsFormat'
import type { MonthRange, MonthRangeDraft } from '../types'

const MAX_RANGE_MONTHS = 24

type MonthRangeFormProps = {
  appliedRange: MonthRange
  defaultRange: MonthRange
  onApply: (range: MonthRange) => void
}

export type MonthRangeErrors = {
  form?: string
}

function rangeToDraft(range: MonthRange): MonthRangeDraft {
  return {
    startYear: String(range.startYear),
    startMonth: String(range.startMonth),
    endYear: String(range.endYear),
    endMonth: String(range.endMonth),
  }
}

function validateDraft(draft: MonthRangeDraft): { errors: MonthRangeErrors; range: MonthRange | null } {
  const startYearRaw = draft.startYear.trim()
  const startMonthRaw = draft.startMonth.trim()
  const endYearRaw = draft.endYear.trim()
  const endMonthRaw = draft.endMonth.trim()

  if (!startYearRaw || !startMonthRaw || !endYearRaw || !endMonthRaw) {
    return { errors: { form: 'Select a start and end month and year.' }, range: null }
  }

  const startYear = Number(startYearRaw)
  const startMonth = Number(startMonthRaw)
  const endYear = Number(endYearRaw)
  const endMonth = Number(endMonthRaw)

  if (!Number.isInteger(startYear) || startYear < FILTER_YEAR_MIN || startYear > FILTER_YEAR_MAX) {
    return {
      errors: { form: `Select a start year between ${FILTER_YEAR_MIN} and ${FILTER_YEAR_MAX}.` },
      range: null,
    }
  }
  if (!Number.isInteger(endYear) || endYear < FILTER_YEAR_MIN || endYear > FILTER_YEAR_MAX) {
    return {
      errors: { form: `Select an end year between ${FILTER_YEAR_MIN} and ${FILTER_YEAR_MAX}.` },
      range: null,
    }
  }
  if (!Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12) {
    return { errors: { form: 'Select a valid start month.' }, range: null }
  }
  if (!Number.isInteger(endMonth) || endMonth < 1 || endMonth > 12) {
    return { errors: { form: 'Select a valid end month.' }, range: null }
  }

  const range: MonthRange = { startYear, startMonth, endYear, endMonth }

  if (monthIndex(startYear, startMonth) > monthIndex(endYear, endMonth)) {
    return { errors: { form: 'Start period must not be after the end period.' }, range: null }
  }

  const monthCount = rangeMonthCount(range)
  if (monthCount > MAX_RANGE_MONTHS) {
    return {
      errors: { form: `Requested range spans ${monthCount} months; the maximum is ${MAX_RANGE_MONTHS} months.` },
      range: null,
    }
  }

  return { errors: {}, range }
}

export function MonthRangeForm({ appliedRange, defaultRange, onApply }: MonthRangeFormProps) {
  const [draft, setDraft] = useState<MonthRangeDraft>(() => rangeToDraft(appliedRange))
  const [errors, setErrors] = useState<MonthRangeErrors>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateDraft(draft)
    setErrors(result.errors)
    if (result.range) {
      onApply(result.range)
    }
  }

  function handleReset() {
    setErrors({})
    setDraft(rangeToDraft(defaultRange))
    onApply(defaultRange)
  }

  return (
    <form className="month-range-form" onSubmit={handleSubmit} noValidate>
      <fieldset>
        <legend>Report range</legend>
        {errors.form ? (
          <p className="form-error" role="alert">
            {errors.form}
          </p>
        ) : null}
        <div className="month-range-grid">
          <div className="field">
            <label htmlFor="range-start-month">Start month</label>
            <select
              id="range-start-month"
              value={draft.startMonth}
              onChange={(event) =>
                setDraft((current) => ({ ...current, startMonth: event.target.value }))
              }
            >
              <option value="">Select month</option>
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="range-start-year">Start year</label>
            <select
              id="range-start-year"
              value={draft.startYear}
              onChange={(event) =>
                setDraft((current) => ({ ...current, startYear: event.target.value }))
              }
            >
              <option value="">Select year</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="range-end-month">End month</label>
            <select
              id="range-end-month"
              value={draft.endMonth}
              onChange={(event) =>
                setDraft((current) => ({ ...current, endMonth: event.target.value }))
              }
            >
              <option value="">Select month</option>
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="range-end-year">End year</label>
            <select
              id="range-end-year"
              value={draft.endYear}
              onChange={(event) =>
                setDraft((current) => ({ ...current, endYear: event.target.value }))
              }
            >
              <option value="">Select year</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="month-range-actions">
          <button type="submit" className="button button-primary">
            Apply
          </button>
          <button type="button" className="button button-secondary" onClick={handleReset}>
            Reset
          </button>
        </div>
      </fieldset>
    </form>
  )
}

export { validateDraft }
