import { useState, type FormEvent } from 'react'
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
