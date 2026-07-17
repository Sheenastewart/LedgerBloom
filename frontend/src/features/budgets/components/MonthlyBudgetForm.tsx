import { useState, type FormEvent } from 'react'
import {
  amountToRequestValue,
  normalizeAmountInput,
  validateAmount,
} from '../../../utils/moneyUtils'
import {
  FILTER_YEAR_MAX,
  FILTER_YEAR_MIN,
  MONTH_OPTIONS,
  YEAR_OPTIONS,
} from '../../../utils/periodFilterOptions'
import type {
  MonthlyBudgetFormErrors,
  MonthlyBudgetFormValues,
  MonthlyBudgetUpdateRequest,
  MonthlyBudgetWriteRequest,
} from '../types'

type MonthlyBudgetFormProps = {
  mode: 'create' | 'edit'
  initialValues: MonthlyBudgetFormValues
  serverErrors?: MonthlyBudgetFormErrors
  submitting?: boolean
  onSubmit: (values: MonthlyBudgetFormValues) => void
  onCancel: () => void
}

function validateValues(values: MonthlyBudgetFormValues, mode: 'create' | 'edit'): MonthlyBudgetFormErrors {
  const errors: MonthlyBudgetFormErrors = {}

  if (mode === 'create') {
    const monthRaw = values.month.trim()
    const yearRaw = values.year.trim()
    if (!monthRaw) {
      errors.month = 'Month is required.'
    } else {
      const month = Number(monthRaw)
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        errors.month = 'Month must be between January and December.'
      }
    }
    if (!yearRaw) {
      errors.year = 'Year is required.'
    } else {
      const year = Number(yearRaw)
      if (!Number.isInteger(year) || year < FILTER_YEAR_MIN || year > FILTER_YEAR_MAX) {
        errors.year = `Select a year between ${FILTER_YEAR_MIN} and ${FILTER_YEAR_MAX}.`
      }
    }
  }

  const amountError = validateAmount(values.totalLimit)
  if (amountError) {
    errors.totalLimit = amountError
  }

  return errors
}

export function toMonthlyBudgetWriteRequest(values: MonthlyBudgetFormValues): MonthlyBudgetWriteRequest {
  return {
    year: Number(values.year.trim()),
    month: Number(values.month.trim()),
    totalLimit: amountToRequestValue(normalizeAmountInput(values.totalLimit)),
  }
}

export function toMonthlyBudgetUpdateRequest(values: MonthlyBudgetFormValues): MonthlyBudgetUpdateRequest {
  return {
    totalLimit: amountToRequestValue(normalizeAmountInput(values.totalLimit)),
  }
}

export function MonthlyBudgetForm({
  mode,
  initialValues,
  serverErrors = {},
  submitting = false,
  onSubmit,
  onCancel,
}: MonthlyBudgetFormProps) {
  const [values, setValues] = useState<MonthlyBudgetFormValues>(initialValues)
  const [errors, setErrors] = useState<MonthlyBudgetFormErrors>({})

  const merged: MonthlyBudgetFormErrors = { ...errors, ...serverErrors }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateValues(values, mode)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }
    onSubmit(values)
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit} noValidate>
      {merged.form ? (
        <p className="form-error" role="alert">
          {merged.form}
        </p>
      ) : null}

      {mode === 'create' ? (
        <>
          <div className="field">
            <label htmlFor="budget-month">Month</label>
            <select
              id="budget-month"
              value={values.month}
              disabled={submitting}
              aria-invalid={merged.month ? true : undefined}
              aria-describedby={merged.month ? 'budget-month-error' : undefined}
              onChange={(event) => setValues((current) => ({ ...current, month: event.target.value }))}
            >
              <option value="">Select month</option>
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            {merged.month ? (
              <p id="budget-month-error" className="field-error" role="alert">
                {merged.month}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="budget-year">Year</label>
            <select
              id="budget-year"
              value={values.year}
              disabled={submitting}
              aria-invalid={merged.year ? true : undefined}
              aria-describedby={merged.year ? 'budget-year-error' : undefined}
              onChange={(event) => setValues((current) => ({ ...current, year: event.target.value }))}
            >
              <option value="">Select year</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
            {merged.year ? (
              <p id="budget-year-error" className="field-error" role="alert">
                {merged.year}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="field">
        <label htmlFor="budget-total-limit">Total limit</label>
        <input
          id="budget-total-limit"
          type="text"
          inputMode="decimal"
          value={values.totalLimit}
          disabled={submitting}
          aria-invalid={merged.totalLimit ? true : undefined}
          aria-describedby={merged.totalLimit ? 'budget-total-limit-error' : undefined}
          onChange={(event) => setValues((current) => ({ ...current, totalLimit: event.target.value }))}
        />
        {merged.totalLimit ? (
          <p id="budget-total-limit-error" className="field-error" role="alert">
            {merged.totalLimit}
          </p>
        ) : null}
      </div>

      <div className="form-actions">
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? 'Saving…' : mode === 'create' ? 'Create budget' : 'Save changes'}
        </button>
        <button type="button" className="button button-secondary" disabled={submitting} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
