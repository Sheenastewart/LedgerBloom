import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { paths } from '../../../routes/paths'
import '../../../components/sectionNav.css'
import '../../categories/categories.css'

export function SettingsAccountPage() {
  const { user } = useAuth()

  return (
    <main className="content-page">
      <div className="page-header">
        <div>
          <h1>Account</h1>
          <p className="page-subtitle">Your LedgerBloom profile and session details.</p>
        </div>
      </div>

      {user ? (
        <div className="status-panel" role="status">
          <p>
            <strong>Display name:</strong> {user.displayName}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p className="page-subtitle">
            Password changes and fuller account management arrive in the Account Management
            milestone.
          </p>
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
