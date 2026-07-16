import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiClientError } from '../../../api/ApiClientError'
import { useAuth } from '../AuthContext'
import type { LoginFormErrors } from '../types'
import '../../categories/categories.css'
import '../auth.css'

type LocationSuccessState = {
  successMessage?: string
}

function resolveRedirectTarget(search: string): string {
  const params = new URLSearchParams(search)
  const from = params.get('from')
  if (from && from.startsWith('/') && !from.startsWith('//')) {
    return from
  }
  return '/dashboard'
}

function mapServerErrors(error: ApiClientError): LoginFormErrors {
  const next: LoginFormErrors = {}

  for (const fieldError of error.fieldErrors) {
    if (fieldError.field === 'email' || fieldError.field === 'password') {
      next[fieldError.field] = fieldError.message
    }
  }

  if (error.code === 'INVALID_CREDENTIALS') {
    next.form = 'Incorrect email or password. Please try again.'
  } else if (!next.email && !next.password) {
    next.form = error.message
  }

  return next
}

export function LoginPage() {
  const { login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const incomingSuccess = (location.state as LocationSuccessState | null)?.successMessage

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<LoginFormErrors>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: LoginFormErrors = {}
    if (!email.trim()) {
      nextErrors.email = 'Email is required'
    }
    if (!password) {
      nextErrors.password = 'Password is required'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      await login({ email: email.trim(), password })
      navigate(resolveRedirectTarget(location.search), { replace: true })
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(mapServerErrors(error))
      } else {
        setErrors({ form: 'Unable to sign in. Please try again.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <h1>Sign in</h1>
        <p className="page-subtitle">Welcome back to LedgerBloom.</p>

        {incomingSuccess ? (
          <p className="status-banner success" role="status" aria-live="polite">
            {incomingSuccess}
          </p>
        ) : null}

        {errors.form ? (
          <p className="form-error" role="alert">
            {errors.form}
          </p>
        ) : null}

        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            disabled={submitting}
            autoComplete="email"
          />
          {errors.email ? (
            <p id="login-email-error" className="field-error" role="alert">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            disabled={submitting}
            autoComplete="current-password"
          />
          {errors.password ? (
            <p id="login-password-error" className="field-error" role="alert">
              {errors.password}
            </p>
          ) : null}
        </div>

        <div className="form-actions">
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </div>

        <p className="auth-switch">
          Don’t have an account? <Link to="/register">Create one</Link>
        </p>
      </form>
    </main>
  )
}
