import { Link, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchHealth } from '../api/health'
import { useAuth } from '../features/auth/AuthContext'
import { paths } from '../routes/paths'
import { Button } from '../components/ui/Button'

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

  if (!loading && user) {
    return <Navigate to={paths.dashboard} replace />
  }

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
            <Button variant="primary" to={paths.login}>
              Log in
            </Button>
            <Button variant="secondary" to={paths.register}>
              Create an account
            </Button>
          </div>
        </>
      ) : null}

      <p className="home-help-link">
        <Link to={paths.settingsHelp}>View help</Link>
      </p>
    </main>
  )
}
