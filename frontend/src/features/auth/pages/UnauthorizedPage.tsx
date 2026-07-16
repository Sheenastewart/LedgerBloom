import { Link, useLocation } from 'react-router-dom'
import '../../categories/categories.css'
import '../auth.css'

type LocationFromState = {
  from?: string
}

export function UnauthorizedPage() {
  const location = useLocation()
  const from = (location.state as LocationFromState | null)?.from

  return (
    <main className="auth-page">
      <div className="status-panel auth-status-panel" role="alert">
        <h1>Please sign in</h1>
        <p>You need to sign in to view this page.</p>
        <div className="form-actions">
          <Link
            to={from ? `/login?from=${encodeURIComponent(from)}` : '/login'}
            className="button button-primary"
          >
            Sign in
          </Link>
          <Link to="/register" className="button button-secondary">
            Create an account
          </Link>
        </div>
      </div>
    </main>
  )
}
