import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { expenseDisplayTitle, isOtherCategoryName } from '../../../utils/expenseDisplay'
import { paths } from '../../../routes/paths'
import type { Category } from '../../categories/types'
import {
  amountToRequestValue,
  normalizeAmountInput,
  validateAmount,
} from '../amountUtils'
import type { ExpenseFormErrors, ExpenseFormValues } from '../types'

type ExpenseFormProps = {
  mode: 'create' | 'edit'
  initialValues: ExpenseFormValues
  categories: Category[]
  submitting: boolean
  onSubmit: (values: ExpenseFormValues) => Promise<void> | void
  onCancel: () => void
  serverErrors?: ExpenseFormErrors
}

function selectedCategoryName(values: ExpenseFormValues, categories: Category[]): string {
  return categories.find((category) => String(category.id) === values.categoryId)?.name ?? ''
}

function validate(values: ExpenseFormValues, categories: Category[]): ExpenseFormErrors {
  const errors: ExpenseFormErrors = {}
  const trimmedDescription = values.description.trim()
  const trimmedMerchant = values.merchant.trim()
  const categoryName = selectedCategoryName(values, categories)

  if (!values.categoryId.trim()) {
    errors.categoryId = 'Category is required'
  } else {
    const categoryId = Number(values.categoryId)
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      errors.categoryId = 'Category is required'
    }
  }

  if (isOtherCategoryName(categoryName) && !trimmedMerchant) {
    errors.merchant = 'Merchant is required when category is Other'
  } else if (trimmedMerchant.length > 120) {
    errors.merchant = 'Merchant must be at most 120 characters'
  }

  if (trimmedDescription.length > 160) {
    errors.description = 'Payment source must be at most 160 characters'
  }

  const amountError = validateAmount(values.amount)
  if (amountError) {
    errors.amount = amountError
  }

  if (!values.expenseDate.trim()) {
    errors.expenseDate = 'Expense date is required'
  }

  return errors
}

export function toExpenseWriteRequest(values: ExpenseFormValues) {
  const description = values.description.trim()
  const merchant = values.merchant.trim()
  const notes = values.notes.trim()
  const normalizedAmount = normalizeAmountInput(values.amount)

  return {
    description: description.length === 0 ? null : description,
    merchant: merchant.length === 0 ? null : merchant,
    amount: amountToRequestValue(normalizedAmount),
    expenseDate: values.expenseDate,
    categoryId: Number(values.categoryId),
    notes: notes.length === 0 ? null : notes,
  }
}

export { expenseDisplayTitle }

export function ExpenseForm({
  mode,
  initialValues,
  categories,
  submitting,
  onSubmit,
  onCancel,
  serverErrors,
}: ExpenseFormProps) {
  const [values, setValues] = useState<ExpenseFormValues>(initialValues)
  const [clientErrors, setClientErrors] = useState<ExpenseFormErrors>({})

  const descriptionError = clientErrors.description ?? serverErrors?.description
  const merchantError = clientErrors.merchant ?? serverErrors?.merchant
  const amountError = clientErrors.amount ?? serverErrors?.amount
  const expenseDateError = clientErrors.expenseDate ?? serverErrors?.expenseDate
  const categoryIdError = clientErrors.categoryId ?? serverErrors?.categoryId
  const notesError = clientErrors.notes ?? serverErrors?.notes
  const formError = serverErrors?.form
  const categoryName = selectedCategoryName(values, categories)
  const otherSelected = isOtherCategoryName(categoryName)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(values, categories)
    setClientErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }
    await onSubmit(values)
  }

  if (categories.length === 0) {
    return (
      <div className="status-panel" role="status">
        <h1>{mode === 'create' ? 'Add expense' : 'Edit expense'}</h1>
        <p>Create at least one category before adding expenses.</p>
        <Link to={paths.budgetsCategoryNew} className="button button-primary">
          Add category
        </Link>
        <button type="button" className="button button-secondary" onClick={onCancel}>
          Back to expenses
        </button>
      </div>
    )
  }

  return (
    <form className="expense-form" onSubmit={(event) => void handleSubmit(event)} noValidate autoComplete="off">
      <h1>{mode === 'create' ? 'Add expense' : 'Edit expense'}</h1>

      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="expense-category">Category</label>
        <select
          id="expense-category"
          name="categoryId"
          value={values.categoryId}
          onChange={(event) =>
            setValues((current) => ({ ...current, categoryId: event.target.value }))
          }
          aria-invalid={categoryIdError ? true : undefined}
          aria-describedby={categoryIdError ? 'expense-category-error' : undefined}
          disabled={submitting}
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
        {categoryIdError ? (
          <p id="expense-category-error" className="field-error" role="alert">
            {categoryIdError}
          </p>
        ) : null}
        <p className="field-hint">
          Required — this determines which budget group receives the spending.{' '}
          <Link to={paths.budgetsCategories}>Manage categories</Link>
        </p>
      </div>

      <div className="field">
        <label htmlFor="expense-merchant">Merchant</label>
        <input
          id="expense-merchant"
          name="merchant"
          type="text"
          value={values.merchant}
          onChange={(event) =>
            setValues((current) => ({ ...current, merchant: event.target.value }))
          }
          aria-invalid={merchantError ? true : undefined}
          aria-describedby={merchantError ? 'expense-merchant-error' : 'expense-merchant-hint'}
          disabled={submitting}
          autoComplete="off"
        />
        <p id="expense-merchant-hint" className="field-hint">
          {otherSelected
            ? 'Required when category is Other'
            : 'Who was paid — for example Netflix or the power company'}
        </p>
        {merchantError ? (
          <p id="expense-merchant-error" className="field-error" role="alert">
            {merchantError}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="expense-description">Payment source</label>
        <input
          id="expense-description"
          name="description"
          type="text"
          value={values.description}
          onChange={(event) =>
            setValues((current) => ({ ...current, description: event.target.value }))
          }
          aria-invalid={descriptionError ? true : undefined}
          aria-describedby={
            descriptionError ? 'expense-description-error' : 'expense-description-hint'
          }
          disabled={submitting}
          autoComplete="off"
        />
        <p id="expense-description-hint" className="field-hint">
          Optional — which card or account this came from
        </p>
        {descriptionError ? (
          <p id="expense-description-error" className="field-error" role="alert">
            {descriptionError}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="expense-amount">Amount</label>
        <input
          id="expense-amount"
          name="amount"
          type="text"
          inputMode="decimal"
          value={values.amount}
          onChange={(event) =>
            setValues((current) => ({ ...current, amount: event.target.value }))
          }
          aria-invalid={amountError ? true : undefined}
          aria-describedby={amountError ? 'expense-amount-error' : 'expense-amount-hint'}
          disabled={submitting}
          autoComplete="off"
        />
        <p id="expense-amount-hint" className="field-hint">
          Greater than zero, up to 10 digits before the decimal and 2 after
        </p>
        {amountError ? (
          <p id="expense-amount-error" className="field-error" role="alert">
            {amountError}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="expense-date">Expense date</label>
        <input
          id="expense-date"
          name="expenseDate"
          type="date"
          value={values.expenseDate}
          onChange={(event) =>
            setValues((current) => ({ ...current, expenseDate: event.target.value }))
          }
          aria-invalid={expenseDateError ? true : undefined}
          aria-describedby={expenseDateError ? 'expense-date-error' : undefined}
          disabled={submitting}
        />
        {expenseDateError ? (
          <p id="expense-date-error" className="field-error" role="alert">
            {expenseDateError}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="expense-notes">Notes</label>
        <textarea
          id="expense-notes"
          name="expenseNotes"
          rows={4}
          value={values.notes}
          autoComplete="off"
          onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
          aria-invalid={notesError ? true : undefined}
          aria-describedby={notesError ? 'expense-notes-error' : 'expense-notes-hint'}
          disabled={submitting}
        />
        <p id="expense-notes-hint" className="field-hint">
          Optional
        </p>
        {notesError ? (
          <p id="expense-notes-error" className="field-error" role="alert">
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
              ? 'Create expense'
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
