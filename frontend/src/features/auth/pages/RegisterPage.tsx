import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiClientError } from '../../../api/ApiClientError'
import { useAuth } from '../AuthContext'
import type { RegisterFormErrors } from '../types'
import '../../categories/categories.css'
import '../auth.css'

type FormValues = {
  email: string
  password: string
  confirmPassword: string
  displayName: string
}

function validate(values: FormValues): RegisterFormErrors {
  const errors: RegisterFormErrors = {}

  if (!values.email.trim()) {
    errors.email = 'Email is required'
  }

  if (!values.password) {
    errors.password = 'Password is required'
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Confirm password is required'
  } else if (values.password && values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords must match'
  }

  if (!values.displayName.trim()) {
    errors.displayName = 'Display name is required'
  } else if (values.displayName.trim().length > 120) {
    errors.displayName = 'Display name must be at most 120 characters'
  }

  return errors
}

function mapServerErrors(error: ApiClientError): RegisterFormErrors {
  const next: RegisterFormErrors = {}

  for (const fieldError of error.fieldErrors) {
    if (
      fieldError.field === 'email' ||
      fieldError.field === 'password' ||
      fieldError.field === 'confirmPassword' ||
      fieldError.field === 'displayName'
    ) {
      next[fieldError.field] = fieldError.message
    }
  }

  if (error.code === 'EMAIL_ALREADY_EXISTS') {
    next.email = error.message
  } else if (Object.keys(next).length === 0) {
    next.form = error.message
  }

  return next
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [values, setValues] = useState<FormValues>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<RegisterFormErrors>({})

  function updateField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      await register({
        email: values.email.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
        displayName: values.displayName.trim(),
      })
      navigate('/login', {
        state: { successMessage: 'Account created. Please sign in.' },
      })
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(mapServerErrors(error))
      } else {
        setErrors({ form: 'Unable to create your account. Please try again.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <h1>Create your account</h1>
        <p className="page-subtitle">Start tracking your budget with LedgerBloom.</p>

        {errors.form ? (
          <p className="form-error" role="alert">
            {errors.form}
          </p>
        ) : null}

        <div className="field">
          <label htmlFor="register-display-name">Display name</label>
          <input
            id="register-display-name"
            name="displayName"
            type="text"
            value={values.displayName}
            onChange={(event) => updateField('displayName', event.target.value)}
            aria-invalid={errors.displayName ? true : undefined}
            aria-describedby={errors.displayName ? 'register-display-name-error' : undefined}
            disabled={submitting}
            autoComplete="name"
          />
          {errors.displayName ? (
            <p id="register-display-name-error" className="field-error" role="alert">
              {errors.displayName}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            name="email"
            type="email"
            value={values.email}
            onChange={(event) => updateField('email', event.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'register-email-error' : undefined}
            disabled={submitting}
            autoComplete="email"
          />
          {errors.email ? (
            <p id="register-email-error" className="field-error" role="alert">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            name="password"
            type="password"
            value={values.password}
            onChange={(event) => updateField('password', event.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'register-password-error' : undefined}
            disabled={submitting}
            autoComplete="new-password"
          />
          {errors.password ? (
            <p id="register-password-error" className="field-error" role="alert">
              {errors.password}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="register-confirm-password">Confirm password</label>
          <input
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            value={values.confirmPassword}
            onChange={(event) => updateField('confirmPassword', event.target.value)}
            aria-invalid={errors.confirmPassword ? true : undefined}
            aria-describedby={errors.confirmPassword ? 'register-confirm-password-error' : undefined}
            disabled={submitting}
            autoComplete="new-password"
          />
          {errors.confirmPassword ? (
            <p id="register-confirm-password-error" className="field-error" role="alert">
              {errors.confirmPassword}
            </p>
          ) : null}
        </div>

        <div className="form-actions">
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </div>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </main>
  )
}
