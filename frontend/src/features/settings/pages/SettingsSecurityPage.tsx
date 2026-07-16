import { Link } from 'react-router-dom'
import { paths } from '../../../routes/paths'
import '../../categories/categories.css'

export function SettingsSecurityPage() {
  return (
    <main className="content-page">
      <div className="page-header">
        <div>
          <h1>Security</h1>
          <p className="page-subtitle">How LedgerBloom helps protect your account.</p>
        </div>
      </div>
      <section className="status-panel">
        <h2>Password security</h2>
        <p>
          Choose a password of at least 12 characters. Passwords are stored hashed, never in plain
          text. You can change your password anytime from Account settings.
        </p>
      </section>
      <section className="status-panel">
        <h2>Active sessions</h2>
        <p>
          Signing in creates a secure browser session for this device. Refreshing the page restores
          your current session. Other devices keep their own sessions until they time out or you
          sign out there.
        </p>
      </section>
      <section className="status-panel">
        <h2>Sessions and logout</h2>
        <p>
          Use Log out when you finish, especially on a shared device. Logout ends the current
          session immediately so protected pages require signing in again.
        </p>
      </section>
      <section className="status-panel">
        <h2>Request protection (CSRF)</h2>
        <p>
          LedgerBloom protects account-changing requests with CSRF safeguards so other websites
          cannot quietly submit actions using your signed-in browser session.
        </p>
      </section>
      <section className="status-panel">
        <h2>Password reset</h2>
        <p>
          If you forget your password, request reset instructions using your email address. Reset
          links are single-use and expire. LedgerBloom does not reveal whether an email is
          registered.
        </p>
        <Link className="button button-primary" to={paths.forgotPassword}>
          Reset your password
        </Link>
      </section>
    </main>
  )
}
