import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { HowThisWorks } from '../../../components/HowThisWorks'
import { ErrorPanel, LoadingState } from '../../../components/ui/Feedback'
import { DashboardPeriodForm } from '../../dashboard/components/DashboardPeriodForm'
import { getMonthlyDashboard } from '../../dashboard/api/dashboardApi'
import type { DashboardPeriod, MonthlyDashboard } from '../../dashboard/types'
import { HelpLink } from '../../guidance/HelpLink'
import { getMonthlyComparison } from '../api/reportsApi'
import { buildInsights } from '../insights'
import { currentPeriod } from '../reportsFormat'
import type { MonthlyComparisonItem } from '../types'
import '../reports.css'
import '../../dashboard/pages/dashboardPolish.css'
import '../../guidance/help.css'

function previousPeriod(period: DashboardPeriod): DashboardPeriod {
  if (period.month === 1) {
    return { year: period.year - 1, month: 12 }
  }
  return { year: period.year, month: period.month - 1 }
}

export function InsightsPage() {
  const [period, setPeriod] = useState<DashboardPeriod>(currentPeriod)
  const [dashboard, setDashboard] = useState<MonthlyDashboard | null>(null)
  const [previous, setPrevious] = useState<MonthlyComparisonItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (nextPeriod: DashboardPeriod, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    const prior = previousPeriod(nextPeriod)
    try {
      const [dash, comparison] = await Promise.all([
        getMonthlyDashboard(nextPeriod, signal),
        getMonthlyComparison(
          {
            startYear: prior.year,
            startMonth: prior.month,
            endYear: nextPeriod.year,
            endMonth: nextPeriod.month,
          },
          signal,
        ),
      ])
      if (signal?.aborted) return
      setDashboard(dash)
      setPrevious(
        comparison.months.find((m) => m.year === prior.year && m.month === prior.month) ?? null,
      )
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) return
      if (err instanceof ApiClientError) {
        setError(err.message)
      } else {
        setError('Unable to load insights. Please try again.')
      }
      setDashboard(null)
      setPrevious(null)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(period, controller.signal)
    return () => controller.abort()
  }, [load, period])

  const insights = useMemo(
    () => (dashboard ? buildInsights({ current: dashboard, previous }) : []),
    [dashboard, previous],
  )

  return (
    <main className="reports-page page">
      <div className="page-header page-header--compact">
        <div>
          <h2 className="page-title-secondary">Insights</h2>
          <p className="page-subtitle">
            Proven observations from your saved totals — no predictions or AI.
          </p>
        </div>
      </div>

      <HowThisWorks>
        <p>Insights only use recorded income, expenses, budgets, and prior-month totals.</p>
        <HelpLink to="/settings/help?topic=understanding-calculations">Learn more</HelpLink>
      </HowThisWorks>

      <DashboardPeriodForm appliedPeriod={period} onApply={setPeriod} />
      {error ? <ErrorPanel onRetry={() => void load(period)}>{error}</ErrorPanel> : null}
      {loading ? <LoadingState>Loading insights…</LoadingState> : null}

      {!loading && !error ? (
        insights.length === 0 ? (
          <p className="dashboard-empty" role="status">
            Not enough data yet for insights this month.
          </p>
        ) : (
          <ul className="insight-list" aria-label="Insights">
            {insights.map((insight) => (
              <li key={insight.id} className={`insight-card insight-card--${insight.tone}`}>
                <h3>{insight.title}</h3>
                <p>{insight.detail}</p>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </main>
  )
}
