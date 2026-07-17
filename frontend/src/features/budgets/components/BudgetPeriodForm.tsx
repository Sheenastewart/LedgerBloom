import { useEffect, useState, type FormEvent } from 'react'
import {
  FILTER_YEAR_MAX,
  FILTER_YEAR_MIN,
  MONTH_OPTIONS,
  YEAR_OPTIONS,
} from '../../../utils/periodFilterOptions'
import type { BudgetPeriod, BudgetPeriodDraft } from '../types'

type BudgetPeriodFormProps = {
  appliedPeriod: BudgetPeriod
  onApply: (period: BudgetPeriod) => void
}

export type BudgetPeriodErrors = {
  month?: string
  year?: string
  form?: string
}

function periodToDraft(period: BudgetPeriod): BudgetPeriodDraft {
  return {
    month: String(period.month),
    year: String(period.year),
  }
}

function validateDraft(draft: BudgetPeriodDraft): {
  errors: BudgetPeriodErrors
  period: BudgetPeriod | null
} {
  const errors: BudgetPeriodErrors = {}
  const monthRaw = draft.month.trim()
  const yearRaw = draft.year.trim()

  if (!monthRaw || !yearRaw) {
    errors.form = 'Select both month and year.'
  }

  let month: number | undefined
  if (monthRaw) {
    month = Number(monthRaw)
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      errors.month = 'Month must be between January and December.'
    }
  }

  let year: number | undefined
  if (yearRaw) {
    year = Number(yearRaw)
    if (!Number.isInteger(year) || year < FILTER_YEAR_MIN || year > FILTER_YEAR_MAX) {
      errors.year = `Select a year between ${FILTER_YEAR_MIN} and ${FILTER_YEAR_MAX}.`
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors, period: null }
  }

  return {
    errors,
    period: { year: year as number, month: month as number },
  }
}

export function BudgetPeriodForm({ appliedPeriod, onApply }: BudgetPeriodFormProps) {
  const [draft, setDraft] = useState<BudgetPeriodDraft>(() => periodToDraft(appliedPeriod))
  const [errors, setErrors] = useState<BudgetPeriodErrors>({})

  useEffect(() => {
    setDraft(periodToDraft(appliedPeriod))
  }, [appliedPeriod])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateDraft(draft)
    setErrors(result.errors)
    if (result.period) {
      onApply(result.period)
    }
  }

  return (
    <form className="dashboard-period" onSubmit={handleSubmit} noValidate>
      <fieldset>
        <legend>Budget period</legend>
        {errors.form ? (
          <p className="form-error" role="alert">
            {errors.form}
          </p>
        ) : null}
        <div className="dashboard-period-grid">
          <div className="field">
            <label htmlFor="budget-period-month">Month</label>
            <select
              id="budget-period-month"
              value={draft.month}
              aria-invalid={errors.month ? true : undefined}
              aria-describedby={errors.month ? 'budget-period-month-error' : undefined}
              onChange={(event) => setDraft((current) => ({ ...current, month: event.target.value }))}
            >
              <option value="">Select month</option>
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            {errors.month ? (
              <p id="budget-period-month-error" className="field-error" role="alert">
                {errors.month}
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="budget-period-year">Year</label>
            <select
              id="budget-period-year"
              value={draft.year}
              aria-invalid={errors.year ? true : undefined}
              aria-describedby={errors.year ? 'budget-period-year-error' : undefined}
              onChange={(event) => setDraft((current) => ({ ...current, year: event.target.value }))}
            >
              <option value="">Select year</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
            {errors.year ? (
              <p id="budget-period-year-error" className="field-error" role="alert">
                {errors.year}
              </p>
            ) : null}
          </div>
        </div>
        <div className="dashboard-period-actions">
          <button type="submit" className="button button-primary">
            Load budget
          </button>
        </div>
      </fieldset>
    </form>
  )
}

export { MONTH_OPTIONS, validateDraft }
