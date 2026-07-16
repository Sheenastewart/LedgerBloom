import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiClientError } from '../../../api/ApiClientError'
import { resetPassword } from '../api/authApi'
import '../auth.css'
import '../../categories/categories.css'

type FormErrors = {
  newPassword?: string
  confirmNewPassword?: string
  form?: string
}

export function ResetPasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const token = new URLSearchParams(location.search).get('token') ?? ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    if (!token) nextErrors.form = 'This password reset link is invalid or incomplete.'
    if (!newPassword.trim()) nextErrors.newPassword = 'New password is required'
    else if (newPassword.length < 12) nextErrors.newPassword = 'Password must be at least 12 characters'
    if (!confirmNewPassword.trim()) nextErrors.confirmNewPassword = 'Confirm password is required'
    else if (confirmNewPassword !== newPassword) nextErrors.confirmNewPassword = 'Passwords must match'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    try {
      await resetPassword({ token, newPassword, confirmNewPassword })
      navigate('/login', { replace: true, state: { successMessage: 'Your password has been reset. Please sign in.' } })
    } catch (error) {
      if (error instanceof ApiClientError) {
        const serverErrors: FormErrors = {}
        for (const fieldError of error.fieldErrors) {
          if (fieldError.field === 'newPassword' || fieldError.field === 'confirmNewPassword') serverErrors[fieldError.field] = fieldError.message
        }
        setErrors(Object.keys(serverErrors).length ? serverErrors : { form: error.message })
      } else {
        setErrors({ form: 'Unable to reset your password. Please try again.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <h1>Choose a new password</h1>
        <p className="page-subtitle">Use a password with at least 12 characters.</p>
        {errors.form ? <p className="form-error" role="alert">{errors.form}</p> : null}
        <div className="form-field">
          <label htmlFor="reset-new-password">New password</label>
          <input id="reset-new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={submitting} aria-invalid={errors.newPassword ? true : undefined} aria-describedby={errors.newPassword ? 'reset-new-password-error' : undefined} autoComplete="new-password" />
          {errors.newPassword ? <p id="reset-new-password-error" className="field-error" role="alert">{errors.newPassword}</p> : null}
        </div>
        <div className="form-field">
          <label htmlFor="reset-confirm-password">Confirm new password</label>
          <input id="reset-confirm-password" type="password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} disabled={submitting} aria-invalid={errors.confirmNewPassword ? true : undefined} aria-describedby={errors.confirmNewPassword ? 'reset-confirm-password-error' : undefined} autoComplete="new-password" />
          {errors.confirmNewPassword ? <p id="reset-confirm-password-error" className="field-error" role="alert">{errors.confirmNewPassword}</p> : null}
        </div>
        <button type="submit" className="button button-primary" disabled={submitting}>{submitting ? 'Resetting…' : 'Reset password'}</button>
        <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
      </form>
    </main>
  )
}
