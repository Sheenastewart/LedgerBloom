import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchHealth } from '../api/health'

type HealthStatus = 'loading' | 'connected' | 'unavailable'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export function HomePage() {
  const [status, setStatus] = useState<HealthStatus>('loading')

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
      <div className="home-actions">
        <Link to="/categories" className="button button-primary">
          Manage categories
        </Link>
        <Link to="/expenses" className="button button-secondary">
          Manage expenses
        </Link>
      </div>

      <section className="coming-soon-card" aria-labelledby="coming-soon-heading">
        <h2 id="coming-soon-heading">Coming soon</h2>
        <p>
          Income tracking will be added in a future stage. LedgerBloom currently supports
          categories and expenses only.
        </p>
      </section>
    </main>
  )
}
