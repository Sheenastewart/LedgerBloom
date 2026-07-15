import { useEffect, useState, type FormEvent } from 'react'
import type { BudgetPeriod, BudgetPeriodDraft } from '../types'

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
    if (!Number.isInteger(year) || year < 1 || year > 9999) {
      errors.year = 'Enter a valid year between 1 and 9999.'
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
            <input
              id="budget-period-year"
              type="number"
              inputMode="numeric"
              min={1}
              max={9999}
              value={draft.year}
              aria-invalid={errors.year ? true : undefined}
              aria-describedby={errors.year ? 'budget-period-year-error' : undefined}
              onChange={(event) => setDraft((current) => ({ ...current, year: event.target.value }))}
            />
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
