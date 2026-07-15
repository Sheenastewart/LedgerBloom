import { useState, type FormEvent } from 'react'
import {
  amountToRequestValue,
  normalizeAmountInput,
  validateAmount,
} from '../../../utils/moneyUtils'
import {
  CADENCE_OPTIONS,
  type RecurringIncomeFormErrors,
  type RecurringIncomeFormValues,
  type RecurringIncomeWriteRequest,
} from '../types'

type RecurringIncomeFormProps = {
  mode: 'create' | 'edit'
  initialValues: RecurringIncomeFormValues
  serverErrors?: RecurringIncomeFormErrors
  submitting?: boolean
  onSubmit: (values: RecurringIncomeFormValues) => void
  onCancel: () => void
}

function validateValues(values: RecurringIncomeFormValues): RecurringIncomeFormErrors {
  const errors: RecurringIncomeFormErrors = {}
  if (!values.description.trim()) {
    errors.description = 'Description is required.'
  } else if (values.description.trim().length > 160) {
    errors.description = 'Description must be at most 160 characters.'
  }
  if (!values.source.trim()) {
    errors.source = 'Source is required.'
  } else if (values.source.trim().length > 120) {
    errors.source = 'Source must be at most 120 characters.'
  }
  const amountError = validateAmount(values.amount)
  if (amountError) {
    errors.amount = amountError
  }
  if (!values.cadence.trim()) {
    errors.cadence = 'Cadence is required.'
  }
  if (!values.nextIncomeDate.trim()) {
    errors.nextIncomeDate = 'Next income date is required.'
  }
  return errors
}

export function toRecurringIncomeWriteRequest(
  values: RecurringIncomeFormValues,
): RecurringIncomeWriteRequest {
  return {
    description: values.description.trim(),
    source: values.source.trim(),
    amount: amountToRequestValue(normalizeAmountInput(values.amount)),
    cadence: values.cadence as RecurringIncomeWriteRequest['cadence'],
    nextIncomeDate: values.nextIncomeDate,
    active: values.active,
    notes: values.notes.trim() ? values.notes.trim() : null,
  }
}

export function RecurringIncomeForm({
  mode,
  initialValues,
  serverErrors = {},
  submitting = false,
  onSubmit,
  onCancel,
}: RecurringIncomeFormProps) {
  const [values, setValues] = useState<RecurringIncomeFormValues>(initialValues)
  const [errors, setErrors] = useState<RecurringIncomeFormErrors>({})
  const merged: RecurringIncomeFormErrors = { ...errors, ...serverErrors }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateValues(values)
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

      <div className="field">
        <label htmlFor="recurring-income-description">Description</label>
        <input
          id="recurring-income-description"
          value={values.description}
          disabled={submitting}
          aria-invalid={merged.description ? true : undefined}
          aria-describedby={merged.description ? 'recurring-income-description-error' : undefined}
          onChange={(event) =>
            setValues((current) => ({ ...current, description: event.target.value }))
          }
        />
        {merged.description ? (
          <p id="recurring-income-description-error" className="field-error" role="alert">
            {merged.description}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-income-source">Source</label>
        <input
          id="recurring-income-source"
          value={values.source}
          disabled={submitting}
          aria-invalid={merged.source ? true : undefined}
          aria-describedby={merged.source ? 'recurring-income-source-error' : undefined}
          onChange={(event) => setValues((current) => ({ ...current, source: event.target.value }))}
        />
        {merged.source ? (
          <p id="recurring-income-source-error" className="field-error" role="alert">
            {merged.source}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-income-amount">Amount</label>
        <input
          id="recurring-income-amount"
          type="text"
          inputMode="decimal"
          value={values.amount}
          disabled={submitting}
          aria-invalid={merged.amount ? true : undefined}
          aria-describedby={merged.amount ? 'recurring-income-amount-error' : undefined}
          onChange={(event) => setValues((current) => ({ ...current, amount: event.target.value }))}
        />
        {merged.amount ? (
          <p id="recurring-income-amount-error" className="field-error" role="alert">
            {merged.amount}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-income-cadence">Cadence</label>
        <select
          id="recurring-income-cadence"
          value={values.cadence}
          disabled={submitting}
          aria-invalid={merged.cadence ? true : undefined}
          aria-describedby={merged.cadence ? 'recurring-income-cadence-error' : undefined}
          onChange={(event) => setValues((current) => ({ ...current, cadence: event.target.value }))}
        >
          <option value="">Select cadence</option>
          {CADENCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {merged.cadence ? (
          <p id="recurring-income-cadence-error" className="field-error" role="alert">
            {merged.cadence}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-income-next-income-date">Next income date</label>
        <input
          id="recurring-income-next-income-date"
          type="date"
          value={values.nextIncomeDate}
          disabled={submitting}
          aria-invalid={merged.nextIncomeDate ? true : undefined}
          aria-describedby={
            merged.nextIncomeDate ? 'recurring-income-next-income-date-error' : undefined
          }
          onChange={(event) =>
            setValues((current) => ({ ...current, nextIncomeDate: event.target.value }))
          }
        />
        {merged.nextIncomeDate ? (
          <p id="recurring-income-next-income-date-error" className="field-error" role="alert">
            {merged.nextIncomeDate}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-income-active">
          <input
            id="recurring-income-active"
            type="checkbox"
            checked={values.active}
            disabled={submitting}
            onChange={(event) =>
              setValues((current) => ({ ...current, active: event.target.checked }))
            }
          />{' '}
          Active
        </label>
      </div>

      <div className="field">
        <label htmlFor="recurring-income-notes">Notes</label>
        <textarea
          id="recurring-income-notes"
          value={values.notes}
          disabled={submitting}
          rows={3}
          onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting
            ? 'Saving…'
            : mode === 'create'
              ? 'Create recurring income'
              : 'Save changes'}
        </button>
        <button type="button" className="button button-secondary" disabled={submitting} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
