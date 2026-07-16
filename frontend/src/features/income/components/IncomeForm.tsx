import { useState, type FormEvent } from 'react'
import {
  amountToRequestValue,
  normalizeAmountInput,
  validateAmount,
} from '../../../utils/moneyUtils'
import type { IncomeFormErrors, IncomeFormValues } from '../types'

type IncomeFormProps = {
  mode: 'create' | 'edit'
  initialValues: IncomeFormValues
  submitting: boolean
  onSubmit: (values: IncomeFormValues) => Promise<void> | void
  onCancel: () => void
  serverErrors?: IncomeFormErrors
}

function validate(values: IncomeFormValues): IncomeFormErrors {
  const errors: IncomeFormErrors = {}
  const trimmedDescription = values.description.trim()
  const trimmedSource = values.source.trim()

  if (!trimmedDescription) {
    errors.description = 'Description is required'
  } else if (trimmedDescription.length > 160) {
    errors.description = 'Description must be at most 160 characters'
  }

  if (!trimmedSource) {
    errors.source = 'Source is required'
  } else if (trimmedSource.length > 120) {
    errors.source = 'Source must be at most 120 characters'
  }

  const amountError = validateAmount(values.amount)
  if (amountError) {
    errors.amount = amountError
  }

  if (!values.incomeDate.trim()) {
    errors.incomeDate = 'Income date is required'
  }

  return errors
}

export function toIncomeWriteRequest(values: IncomeFormValues) {
  const description = values.description.trim()
  const source = values.source.trim()
  const notes = values.notes.trim()
  const normalizedAmount = normalizeAmountInput(values.amount)

  return {
    description,
    source,
    amount: amountToRequestValue(normalizedAmount),
    incomeDate: values.incomeDate,
    notes: notes.length === 0 ? null : notes,
  }
}

export function IncomeForm({
  mode,
  initialValues,
  submitting,
  onSubmit,
  onCancel,
  serverErrors,
}: IncomeFormProps) {
  const [values, setValues] = useState<IncomeFormValues>(initialValues)
  const [clientErrors, setClientErrors] = useState<IncomeFormErrors>({})

  const descriptionError = clientErrors.description ?? serverErrors?.description
  const sourceError = clientErrors.source ?? serverErrors?.source
  const amountError = clientErrors.amount ?? serverErrors?.amount
  const incomeDateError = clientErrors.incomeDate ?? serverErrors?.incomeDate
  const notesError = clientErrors.notes ?? serverErrors?.notes
  const formError = serverErrors?.form

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(values)
    setClientErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }
    await onSubmit(values)
  }

  return (
    <form className="income-form" onSubmit={(event) => void handleSubmit(event)} noValidate autoComplete="off">
      <h1>{mode === 'create' ? 'Add income' : 'Edit income'}</h1>

      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="income-description">Description</label>
        <input
          id="income-description"
          name="description"
          type="text"
          value={values.description}
          onChange={(event) =>
            setValues((current) => ({ ...current, description: event.target.value }))
          }
          aria-invalid={descriptionError ? true : undefined}
          aria-describedby={
            descriptionError ? 'income-description-error' : 'income-description-hint'
          }
          disabled={submitting}
          autoComplete="off"
        />
        <p id="income-description-hint" className="field-hint">
          Main title in lists and reports — for example Paycheck or Freelance invoice
        </p>
        {descriptionError ? (
          <p id="income-description-error" className="field-error" role="alert">
            {descriptionError}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="income-source">Source</label>
        <input
          id="income-source"
          name="source"
          type="text"
          value={values.source}
          onChange={(event) =>
            setValues((current) => ({ ...current, source: event.target.value }))
          }
          aria-invalid={sourceError ? true : undefined}
          aria-describedby={sourceError ? 'income-source-error' : 'income-source-hint'}
          disabled={submitting}
          autoComplete="off"
        />
        <p id="income-source-hint" className="field-hint">
          Where it came from — employer, client, bank, or account
        </p>
        {sourceError ? (
          <p id="income-source-error" className="field-error" role="alert">
            {sourceError}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="income-amount">Amount</label>
        <input
          id="income-amount"
          name="amount"
          type="text"
          inputMode="decimal"
          value={values.amount}
          onChange={(event) =>
            setValues((current) => ({ ...current, amount: event.target.value }))
          }
          aria-invalid={amountError ? true : undefined}
          aria-describedby={amountError ? 'income-amount-error' : 'income-amount-hint'}
          disabled={submitting}
          autoComplete="off"
        />
        <p id="income-amount-hint" className="field-hint">
          Greater than zero, up to 10 digits before the decimal and 2 after
        </p>
        {amountError ? (
          <p id="income-amount-error" className="field-error" role="alert">
            {amountError}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="income-date">Income date</label>
        <input
          id="income-date"
          name="incomeDate"
          type="date"
          value={values.incomeDate}
          onChange={(event) =>
            setValues((current) => ({ ...current, incomeDate: event.target.value }))
          }
          aria-invalid={incomeDateError ? true : undefined}
          aria-describedby={incomeDateError ? 'income-date-error' : undefined}
          disabled={submitting}
        />
        {incomeDateError ? (
          <p id="income-date-error" className="field-error" role="alert">
            {incomeDateError}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="income-notes">Notes</label>
        <textarea
          id="income-notes"
          name="incomeNotes"
          rows={4}
          value={values.notes}
          autoComplete="off"
          onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
          aria-invalid={notesError ? true : undefined}
          aria-describedby={notesError ? 'income-notes-error' : 'income-notes-hint'}
          disabled={submitting}
        />
        <p id="income-notes-hint" className="field-hint">
          Optional
        </p>
        {notesError ? (
          <p id="income-notes-error" className="field-error" role="alert">
            {notesError}
          </p>
        ) : null}
      </div>

      <div className="form-actions">
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting
            ? mode === 'create'
              ? 'Creating…'
              : 'Saving…'
            : mode === 'create'
              ? 'Create income'
              : 'Save changes'}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
