import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiClientError } from '../../../api/ApiClientError'
import { useAuth } from '../../auth/AuthContext'
import { changePassword, updateProfile } from '../../account/api/accountApi'
import type { AccountFormErrors } from '../../account/types'
import { paths } from '../../../routes/paths'
import '../../../components/sectionNav.css'
import '../../categories/categories.css'

export function SettingsAccountPage() {
  const { user, refreshMe, logout } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [profileErrors, setProfileErrors] = useState<AccountFormErrors>({})
  const [passwordErrors, setPasswordErrors] = useState<AccountFormErrors>({})
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  function serverErrors(error: ApiClientError): AccountFormErrors {
    const errors: AccountFormErrors = {}
    for (const fieldError of error.fieldErrors) {
      if (
        fieldError.field === 'displayName' ||
        fieldError.field === 'currentPassword' ||
        fieldError.field === 'newPassword' ||
        fieldError.field === 'confirmNewPassword'
      ) {
        errors[fieldError.field] = fieldError.message
      }
    }
    if (!Object.keys(errors).length) {
      errors.form = error.message
    }
    return errors
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: AccountFormErrors = {}
    if (!displayName.trim()) errors.displayName = 'Display name is required'
    else if (displayName.trim().length > 120) errors.displayName = 'Display name must be at most 120 characters'
    setProfileErrors(errors)
    setProfileSuccess('')
    if (Object.keys(errors).length) return

    setProfileSubmitting(true)
    try {
      await updateProfile({ displayName: displayName.trim() })
      await refreshMe()
      setProfileSuccess('Profile updated.')
    } catch (error) {
      setProfileErrors(error instanceof ApiClientError ? serverErrors(error) : { form: 'Unable to update your profile. Please try again.' })
    } finally {
      setProfileSubmitting(false)
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: AccountFormErrors = {}
    if (!passwords.currentPassword.trim()) errors.currentPassword = 'Current password is required'
    if (!passwords.newPassword.trim()) errors.newPassword = 'New password is required'
    else if (passwords.newPassword.length < 12) errors.newPassword = 'Password must be at least 12 characters'
    if (!passwords.confirmNewPassword.trim()) errors.confirmNewPassword = 'Confirm password is required'
    else if (passwords.confirmNewPassword !== passwords.newPassword) errors.confirmNewPassword = 'Passwords must match'
    setPasswordErrors(errors)
    setPasswordSuccess('')
    if (Object.keys(errors).length) return

    setPasswordSubmitting(true)
    try {
      await changePassword(passwords)
      setPasswords({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
      setPasswordSuccess('Password changed.')
    } catch (error) {
      setPasswordErrors(error instanceof ApiClientError ? serverErrors(error) : { form: 'Unable to change your password. Please try again.' })
    } finally {
      setPasswordSubmitting(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
      navigate(paths.login, { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <main className="content-page">
      <div className="page-header">
        <div>
          <h1>Account</h1>
          <p className="page-subtitle">Manage your profile, password, and current session.</p>
        </div>
      </div>

      {user ? (
        <div className="status-panel" role="status">
          <form onSubmit={(event) => void handleProfileSubmit(event)} noValidate>
            <h2>Profile</h2>
            {profileSuccess && <p className="status-banner success" role="status">{profileSuccess}</p>}
            {profileErrors.form && <p className="form-error" role="alert">{profileErrors.form}</p>}
            <div className="form-field">
              <label htmlFor="account-display-name">Display name</label>
              <input id="account-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={profileSubmitting} aria-invalid={profileErrors.displayName ? true : undefined} aria-describedby={profileErrors.displayName ? 'account-display-name-error' : undefined} autoComplete="name" />
              {profileErrors.displayName && <p id="account-display-name-error" className="field-error" role="alert">{profileErrors.displayName}</p>}
            </div>
            <div className="form-field">
              <label htmlFor="account-email">Email</label>
              <input id="account-email" value={user.email} readOnly aria-readonly="true" autoComplete="email" />
            </div>
            <button type="submit" className="button button-primary" disabled={profileSubmitting}>{profileSubmitting ? 'Saving…' : 'Save profile'}</button>
          </form>

          <form onSubmit={(event) => void handlePasswordSubmit(event)} noValidate>
            <h2>Change password</h2>
            {passwordSuccess && <p className="status-banner success" role="status">{passwordSuccess}</p>}
            {passwordErrors.form && <p className="form-error" role="alert">{passwordErrors.form}</p>}
            {(['currentPassword', 'newPassword', 'confirmNewPassword'] as const).map((field) => {
              const label = field === 'currentPassword' ? 'Current password' : field === 'newPassword' ? 'New password' : 'Confirm new password'
              const id = `account-${field}`
              return <div className="form-field" key={field}>
                <label htmlFor={id}>{label}</label>
                <input id={id} type="password" value={passwords[field]} onChange={(event) => setPasswords((current) => ({ ...current, [field]: event.target.value }))} disabled={passwordSubmitting} aria-invalid={passwordErrors[field] ? true : undefined} aria-describedby={passwordErrors[field] ? `${id}-error` : undefined} autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'} />
                {passwordErrors[field] && <p id={`${id}-error`} className="field-error" role="alert">{passwordErrors[field]}</p>}
              </div>
            })}
            <button type="submit" className="button button-primary" disabled={passwordSubmitting}>{passwordSubmitting ? 'Changing…' : 'Change password'}</button>
          </form>

          <div>
            <h2>Session</h2>
            <button type="button" className="button" onClick={() => void handleLogout()} disabled={loggingOut}>{loggingOut ? 'Logging out…' : 'Log out'}</button>
          </div>
        </div>
      ) : (
        <div className="status-panel" role="status">
          <p>Sign in to view your account.</p>
          <Link to={paths.login} className="button button-primary">
            Log in
          </Link>
        </div>
      )}
    </main>
  )
}
