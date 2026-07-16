import { useState, type FormEvent } from 'react'
import {
  amountToRequestValue,
  normalizeAmountInput,
  validateAmount,
} from '../../../utils/moneyUtils'
import type {
  CategoryLimitCreateRequest,
  CategoryLimitFormErrors,
  CategoryLimitFormValues,
  CategoryLimitUpdateRequest,
} from '../types'

type CategoryOption = {
  id: number
  name: string
}

type CategoryLimitFormProps = {
  mode: 'create' | 'edit'
  initialValues: CategoryLimitFormValues
  categories: CategoryOption[]
  serverErrors?: CategoryLimitFormErrors
  submitting?: boolean
  onSubmit: (values: CategoryLimitFormValues) => void
  onCancel: () => void
}

const AMOUNT_PATTERN = /^(\d{1,10})(\.\d{1,2})?$/

function validateAssistanceAmount(amount: string): string | undefined {
  const normalized = normalizeAmountInput(amount)
  if (!normalized) {
    return undefined
  }
  if (!AMOUNT_PATTERN.test(normalized)) {
    return 'Enter a valid assistance amount'
  }
  return undefined
}

function assistanceToRequestValue(amount: string): number {
  const normalized = normalizeAmountInput(amount)
  if (!normalized) {
    return 0
  }
  return amountToRequestValue(normalized)
}

function validateValues(
  values: CategoryLimitFormValues,
  mode: 'create' | 'edit',
): CategoryLimitFormErrors {
  const errors: CategoryLimitFormErrors = {}

  if (mode === 'create') {
    if (!values.categoryId.trim()) {
      errors.categoryId = 'Category is required.'
    } else {
      const categoryId = Number(values.categoryId)
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        errors.categoryId = 'Select a valid category.'
      }
    }
  }

  const amountError = validateAmount(values.limitAmount)
  if (amountError) {
    errors.limitAmount = amountError
  }

  const assistanceError = validateAssistanceAmount(values.assistanceAmount)
  if (assistanceError) {
    errors.assistanceAmount = assistanceError
  }

  return errors
}

export function toCategoryLimitCreateRequest(values: CategoryLimitFormValues): CategoryLimitCreateRequest {
  return {
    categoryId: Number(values.categoryId.trim()),
    limitAmount: amountToRequestValue(normalizeAmountInput(values.limitAmount)),
    assistanceAmount: assistanceToRequestValue(values.assistanceAmount),
  }
}

export function toCategoryLimitUpdateRequest(values: CategoryLimitFormValues): CategoryLimitUpdateRequest {
  return {
    limitAmount: amountToRequestValue(normalizeAmountInput(values.limitAmount)),
    assistanceAmount: assistanceToRequestValue(values.assistanceAmount),
  }
}

export function CategoryLimitForm({
  mode,
  initialValues,
  categories,
  serverErrors = {},
  submitting = false,
  onSubmit,
  onCancel,
}: CategoryLimitFormProps) {
  const [values, setValues] = useState<CategoryLimitFormValues>(initialValues)
  const [errors, setErrors] = useState<CategoryLimitFormErrors>({})

  const merged: CategoryLimitFormErrors = { ...errors, ...serverErrors }
  const selectedCategoryName =
    categories.find((category) => String(category.id) === values.categoryId)?.name ?? ''
  const groceriesSelected = selectedCategoryName.toLowerCase() === 'groceries'

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
        <div className="field">
          <label htmlFor="category-limit-category">Category</label>
          <select
            id="category-limit-category"
            value={values.categoryId}
            disabled={submitting}
            aria-invalid={merged.categoryId ? true : undefined}
            aria-describedby={merged.categoryId ? 'category-limit-category-error' : undefined}
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
            <p id="category-limit-category-error" className="field-error" role="alert">
              {merged.categoryId}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="category-limit-amount">Limit amount</label>
        <input
          id="category-limit-amount"
          type="text"
          inputMode="decimal"
          value={values.limitAmount}
          disabled={submitting}
          aria-invalid={merged.limitAmount ? true : undefined}
          aria-describedby={merged.limitAmount ? 'category-limit-amount-error' : undefined}
          onChange={(event) => setValues((current) => ({ ...current, limitAmount: event.target.value }))}
        />
        {merged.limitAmount ? (
          <p id="category-limit-amount-error" className="field-error" role="alert">
            {merged.limitAmount}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="category-limit-assistance">Food assistance</label>
        <input
          id="category-limit-assistance"
          type="text"
          inputMode="decimal"
          value={values.assistanceAmount}
          disabled={submitting}
          aria-invalid={merged.assistanceAmount ? true : undefined}
          aria-describedby={
            merged.assistanceAmount
              ? 'category-limit-assistance-error'
              : 'category-limit-assistance-hint'
          }
          onChange={(event) =>
            setValues((current) => ({ ...current, assistanceAmount: event.target.value }))
          }
        />
        <p id="category-limit-assistance-hint" className="field-hint">
          {groceriesSelected
            ? 'SNAP / food stamps for this month. Covered grocery spend does not count toward this limit or the overall budget.'
            : 'Optional. Covered spend in this category does not count toward this limit or the overall budget.'}
        </p>
        {merged.assistanceAmount ? (
          <p id="category-limit-assistance-error" className="field-error" role="alert">
            {merged.assistanceAmount}
          </p>
        ) : null}
      </div>

      <div className="form-actions">
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? 'Saving…' : mode === 'create' ? 'Save category limit' : 'Save limit'}
        </button>
        <button type="button" className="button button-secondary" disabled={submitting} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
