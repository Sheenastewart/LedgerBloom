import { useState, type FormEvent } from 'react'
import {
  amountToRequestValue,
  normalizeAmountInput,
  validateAmount,
} from '../../../utils/moneyUtils'
import type { Category } from '../../categories/types'
import {
  CADENCE_OPTIONS,
  type RecurringFormErrors,
  type RecurringFormValues,
  type RecurringWriteRequest,
} from '../types'

type RecurringFormProps = {
  mode: 'create' | 'edit'
  initialValues: RecurringFormValues
  categories: Category[]
  serverErrors?: RecurringFormErrors
  submitting?: boolean
  onSubmit: (values: RecurringFormValues) => void
  onCancel: () => void
}

function validateValues(values: RecurringFormValues): RecurringFormErrors {
  const errors: RecurringFormErrors = {}
  if (!values.description.trim()) {
    errors.description = 'Description is required.'
  } else if (values.description.trim().length > 160) {
    errors.description = 'Description must be at most 160 characters.'
  }
  if (values.merchant.trim().length > 120) {
    errors.merchant = 'Merchant must be at most 120 characters.'
  }
  const amountError = validateAmount(values.amount)
  if (amountError) {
    errors.amount = amountError
  }
  if (!values.categoryId.trim()) {
    errors.categoryId = 'Category is required.'
  }
  if (!values.cadence.trim()) {
    errors.cadence = 'Cadence is required.'
  }
  if (!values.nextPaymentDate.trim()) {
    errors.nextPaymentDate = 'Next payment date is required.'
  }
  return errors
}

export function toRecurringWriteRequest(values: RecurringFormValues): RecurringWriteRequest {
  return {
    description: values.description.trim(),
    merchant: values.merchant.trim() ? values.merchant.trim() : null,
    amount: amountToRequestValue(normalizeAmountInput(values.amount)),
    categoryId: Number(values.categoryId),
    cadence: values.cadence as RecurringWriteRequest['cadence'],
    nextPaymentDate: values.nextPaymentDate,
    active: values.active,
    notes: values.notes.trim() ? values.notes.trim() : null,
  }
}

export function RecurringForm({
  mode,
  initialValues,
  categories,
  serverErrors = {},
  submitting = false,
  onSubmit,
  onCancel,
}: RecurringFormProps) {
  const [values, setValues] = useState<RecurringFormValues>(initialValues)
  const [errors, setErrors] = useState<RecurringFormErrors>({})
  const merged: RecurringFormErrors = { ...errors, ...serverErrors }

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
        <label htmlFor="recurring-description">Description</label>
        <input
          id="recurring-description"
          value={values.description}
          disabled={submitting}
          aria-invalid={merged.description ? true : undefined}
          aria-describedby={merged.description ? 'recurring-description-error' : undefined}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
        />
        {merged.description ? (
          <p id="recurring-description-error" className="field-error" role="alert">
            {merged.description}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-merchant">Merchant</label>
        <input
          id="recurring-merchant"
          value={values.merchant}
          disabled={submitting}
          aria-invalid={merged.merchant ? true : undefined}
          aria-describedby={merged.merchant ? 'recurring-merchant-error' : undefined}
          onChange={(event) => setValues((current) => ({ ...current, merchant: event.target.value }))}
        />
        {merged.merchant ? (
          <p id="recurring-merchant-error" className="field-error" role="alert">
            {merged.merchant}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-amount">Amount</label>
        <input
          id="recurring-amount"
          type="text"
          inputMode="decimal"
          value={values.amount}
          disabled={submitting}
          aria-invalid={merged.amount ? true : undefined}
          aria-describedby={merged.amount ? 'recurring-amount-error' : undefined}
          onChange={(event) => setValues((current) => ({ ...current, amount: event.target.value }))}
        />
        {merged.amount ? (
          <p id="recurring-amount-error" className="field-error" role="alert">
            {merged.amount}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-category">Category</label>
        <select
          id="recurring-category"
          value={values.categoryId}
          disabled={submitting}
          aria-invalid={merged.categoryId ? true : undefined}
          aria-describedby={merged.categoryId ? 'recurring-category-error' : undefined}
          onChange={(event) => setValues((current) => ({ ...current, categoryId: event.target.value }))}
        >
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
        {merged.categoryId ? (
          <p id="recurring-category-error" className="field-error" role="alert">
            {merged.categoryId}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-cadence">Cadence</label>
        <select
          id="recurring-cadence"
          value={values.cadence}
          disabled={submitting}
          aria-invalid={merged.cadence ? true : undefined}
          aria-describedby={merged.cadence ? 'recurring-cadence-error' : undefined}
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
          <p id="recurring-cadence-error" className="field-error" role="alert">
            {merged.cadence}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-next-payment-date">Next payment date</label>
        <input
          id="recurring-next-payment-date"
          type="date"
          value={values.nextPaymentDate}
          disabled={submitting}
          aria-invalid={merged.nextPaymentDate ? true : undefined}
          aria-describedby={merged.nextPaymentDate ? 'recurring-next-payment-date-error' : undefined}
          onChange={(event) =>
            setValues((current) => ({ ...current, nextPaymentDate: event.target.value }))
          }
        />
        {merged.nextPaymentDate ? (
          <p id="recurring-next-payment-date-error" className="field-error" role="alert">
            {merged.nextPaymentDate}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-active">
          <input
            id="recurring-active"
            type="checkbox"
            checked={values.active}
            disabled={submitting}
            onChange={(event) => setValues((current) => ({ ...current, active: event.target.checked }))}
          />{' '}
          Active
        </label>
      </div>

      <div className="field">
        <label htmlFor="recurring-notes">Notes</label>
        <textarea
          id="recurring-notes"
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
              ? 'Create recurring expense'
              : 'Save changes'}
        </button>
        <button type="button" className="button button-secondary" disabled={submitting} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
