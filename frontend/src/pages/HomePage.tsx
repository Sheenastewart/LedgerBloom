import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchHealth } from '../api/health'
import { useAuth } from '../features/auth/AuthContext'
import { paths } from '../routes/paths'

type HealthStatus = 'loading' | 'connected' | 'unavailable'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export function HomePage() {
  const [status, setStatus] = useState<HealthStatus>('loading')
  const { user, loading } = useAuth()

  useEffect(() => {
    let cancelled = false

    async function checkHealth() {
      try {
        await fetchHealth(apiBaseUrl)
        if (!cancelled) {
          setStatus('connected')
        }
      } catch {
        if (!cancelled) {
          setStatus('unavailable')
        }
      }
    }

    void checkHealth()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="home-page">
      <h1>LedgerBloom</h1>
      <p className="tagline">Smart budget and receipt tracker</p>
      <p className="status" data-testid="health-status" aria-live="polite">
        {status === 'loading' && 'Checking API connection...'}
        {status === 'connected' && 'API connected'}
        {status === 'unavailable' && 'API unavailable'}
      </p>

      {!loading && !user ? (
        <>
          <p className="home-welcome">Sign in to manage your budgets, expenses, and income.</p>
          <div className="home-actions">
            <Link to={paths.login} className="button button-primary">
              Log in
            </Link>
            <Link to={paths.register} className="button button-secondary">
              Create an account
            </Link>
          </div>
        </>
      ) : null}

      {!loading && user ? (
        <div className="home-actions">
          <Link to={paths.dashboard} className="button button-primary">
            View dashboard
          </Link>
          <Link to={paths.transactions} className="button button-secondary">
            Manage transactions
          </Link>
          <Link to={paths.budgets} className="button button-secondary">
            Manage budgets
          </Link>
          <Link to={paths.reports} className="button button-secondary">
            View reports
          </Link>
          <Link to={paths.settings} className="button button-secondary">
            Open settings
          </Link>
        </div>
      ) : null}

      <p className="home-help-link">
        <Link to={paths.settingsHelp}>View help</Link>
      </p>
    </main>
  )
}
