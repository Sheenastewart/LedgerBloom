import { useState, type FormEvent } from 'react'
import {
  CATEGORY_COLOR_PALETTE,
  resolveCategoryColor,
  softColorFromHex,
} from '../../../utils/categoryColor'
import { BUDGET_GROUPS } from '../../budgets/types'
import type { CategoryFormErrors, CategoryFormValues } from '../types'

type CategoryFormProps = {
  mode: 'create' | 'edit'
  initialValues: CategoryFormValues
  submitting: boolean
  onSubmit: (values: CategoryFormValues) => Promise<void> | void
  onCancel: () => void
  serverErrors?: CategoryFormErrors
}

function validate(values: CategoryFormValues): CategoryFormErrors {
  const errors: CategoryFormErrors = {}
  const trimmedName = values.name.trim()
  const trimmedDescription = values.description.trim()

  if (!trimmedName) {
    errors.name = 'Name is required'
  } else if (trimmedName.length > 80) {
    errors.name = 'Name must be at most 80 characters'
  }

  if (trimmedDescription.length > 255) {
    errors.description = 'Description must be at most 255 characters'
  }
  if (!BUDGET_GROUPS.some((group) => group.key === values.budgetGroup)) {
    errors.budgetGroup = 'Budget group is required'
  }

  return errors
}

export function CategoryForm({
  mode,
  initialValues,
  submitting,
  onSubmit,
  onCancel,
  serverErrors,
}: CategoryFormProps) {
  const [values, setValues] = useState<CategoryFormValues>(initialValues)
  const [clientErrors, setClientErrors] = useState<CategoryFormErrors>({})

  const nameError = clientErrors.name ?? serverErrors?.name
  const descriptionError = clientErrors.description ?? serverErrors?.description
  const colorError = clientErrors.color ?? serverErrors?.color
  const budgetGroupError = clientErrors.budgetGroup ?? serverErrors?.budgetGroup
  const formError = serverErrors?.form

  const previewColor = resolveCategoryColor(values.name || 'Category', values.color || null)

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
    <form className="category-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <h1>{mode === 'create' ? 'Add category' : 'Edit category'}</h1>

      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="category-name">Name</label>
        <input
          id="category-name"
          name="name"
          type="text"
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? 'category-name-error' : undefined}
          disabled={submitting}
          autoComplete="off"
        />
        {nameError ? (
          <p id="category-name-error" className="field-error" role="alert">
            {nameError}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="category-description">Description</label>
        <textarea
          id="category-description"
          name="description"
          rows={4}
          value={values.description}
          onChange={(event) =>
            setValues((current) => ({ ...current, description: event.target.value }))
          }
          aria-invalid={descriptionError ? true : undefined}
          aria-describedby={descriptionError ? 'category-description-error' : undefined}
          disabled={submitting}
        />
        {descriptionError ? (
          <p id="category-description-error" className="field-error" role="alert">
            {descriptionError}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="category-budget-group">Budget group</label>
        <select
          id="category-budget-group"
          name="budgetGroup"
          value={values.budgetGroup}
          onChange={(event) => setValues((current) => ({ ...current, budgetGroup: event.target.value }))}
          aria-invalid={budgetGroupError ? true : undefined}
          aria-describedby={budgetGroupError ? 'category-budget-group-error' : 'category-budget-group-hint'}
          disabled={submitting}
        >
          <option value="">Select a budget group</option>
          {BUDGET_GROUPS.map((group) => (
            <option key={group.key} value={group.key}>{group.label}</option>
          ))}
        </select>
        <p id="category-budget-group-hint" className="field-hint">
          Expenses in this category count toward this group’s monthly limit.
        </p>
        {budgetGroupError ? (
          <p id="category-budget-group-error" className="field-error" role="alert">{budgetGroupError}</p>
        ) : null}
      </div>

      <fieldset className="field category-color-field">
        <legend>Color</legend>
        <p className="field-hint" id="category-color-hint">
          Used on expenses and activity lists so categories are easier to tell apart.
        </p>
        <div
          className="category-color-preview"
          style={{
            ['--category-accent' as string]: previewColor,
            ['--category-accent-soft' as string]: softColorFromHex(previewColor),
          }}
        >
          <span className="category-color-preview__swatch" aria-hidden="true" />
          <span>Preview</span>
        </div>
        <div
          className="category-color-swatches"
          role="radiogroup"
          aria-label="Category color"
          aria-describedby="category-color-hint"
        >
          <label className={`category-color-swatch ${values.color === '' ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="category-color"
              value=""
              checked={values.color === ''}
              disabled={submitting}
              onChange={() => setValues((current) => ({ ...current, color: '' }))}
            />
            <span className="category-color-swatch__chip category-color-swatch__chip--auto">Auto</span>
          </label>
          {CATEGORY_COLOR_PALETTE.map((option) => {
            const selected = (values.color ?? '').toUpperCase() === option.hex
            return (
              <label
                key={option.id}
                className={`category-color-swatch ${selected ? 'is-selected' : ''}`}
                title={option.label}
              >
                <input
                  type="radio"
                  name="category-color"
                  value={option.hex}
                  checked={selected}
                  disabled={submitting}
                  onChange={() => setValues((current) => ({ ...current, color: option.hex }))}
                />
                <span
                  className="category-color-swatch__chip"
                  style={{ background: option.hex }}
                  aria-label={option.label}
                />
              </label>
            )
          })}
        </div>
        {colorError ? (
          <p className="field-error" role="alert">
            {colorError}
          </p>
        ) : null}
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting
            ? mode === 'create'
              ? 'Creating…'
              : 'Saving…'
            : mode === 'create'
              ? 'Create category'
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
