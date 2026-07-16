import { Link } from 'react-router-dom'
import '../../categories/categories.css'
import '../auth.css'

export function ForbiddenPage() {
  return (
    <main className="auth-page">
      <div className="status-panel auth-status-panel" role="alert">
        <h1>Access denied</h1>
        <p>You don’t have permission to view this page.</p>
        <div className="form-actions">
          <Link to="/" className="button button-primary">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
