import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiClientError } from '../../../api/ApiClientError'
import { forgotPassword } from '../api/authApi'
import '../auth.css'
import '../../categories/categories.css'

const SUCCESS_MESSAGE = 'If an account exists for that email address, we sent password reset instructions.'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim()) {
      setError('Email is required')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      await forgotPassword({ email: email.trim() })
      setSubmitted(true)
    } catch (requestError) {
      setError(requestError instanceof ApiClientError ? requestError.message : 'Unable to request a password reset. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <h1>Reset your password</h1>
        <p className="page-subtitle">Enter your email address and we’ll send reset instructions.</p>
        {submitted ? <p className="status-banner success" role="status">{SUCCESS_MESSAGE}</p> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="form-field">
          <label htmlFor="forgot-password-email">Email</label>
          <input id="forgot-password-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={submitting || submitted} aria-invalid={error ? true : undefined} aria-describedby={error ? 'forgot-password-email-error' : undefined} autoComplete="email" />
          {error ? <p id="forgot-password-email-error" className="field-error" role="alert">{error}</p> : null}
        </div>
        {!submitted ? <button type="submit" className="button button-primary" disabled={submitting}>{submitting ? 'Sending…' : 'Send reset instructions'}</button> : null}
        <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
      </form>
    </main>
  )
}
