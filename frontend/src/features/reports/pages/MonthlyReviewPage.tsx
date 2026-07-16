import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { HowThisWorks } from '../../../components/HowThisWorks'
import { ErrorPanel, LoadingState } from '../../../components/ui/Feedback'
import { formatCurrency } from '../../../utils/moneyUtils'
import { DashboardPeriodForm } from '../../dashboard/components/DashboardPeriodForm'
import { getMonthlyDashboard } from '../../dashboard/api/dashboardApi'
import type { DashboardPeriod, MonthlyDashboard } from '../../dashboard/types'
import { HelpLink } from '../../guidance/HelpLink'
import { getMonthlyComparison } from '../api/reportsApi'
import { buildMonthlyReview } from '../insights'
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

export function MonthlyReviewPage() {
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
        setError('Unable to load the monthly review. Please try again.')
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

  const review = useMemo(
    () => (dashboard ? buildMonthlyReview(dashboard, previous) : null),
    [dashboard, previous],
  )

  return (
    <main className="reports-page page">
      <div className="page-header page-header--compact">
        <div>
          <h2 className="page-title-secondary">Monthly review</h2>
          <p className="page-subtitle">A month-in-review snapshot from your saved ledger data.</p>
        </div>
      </div>

      <HowThisWorks>
        <p>Saved = recorded income − recorded expenses for the selected month.</p>
        <p>Comparisons use the previous calendar month from existing report totals.</p>
        <HelpLink to="/settings/help?topic=what-is-monthly-report">Learn more</HelpLink>
      </HowThisWorks>

      <DashboardPeriodForm appliedPeriod={period} onApply={setPeriod} />
      {error ? <ErrorPanel onRetry={() => void load(period)}>{error}</ErrorPanel> : null}
      {loading ? <LoadingState>Loading monthly review…</LoadingState> : null}

      {!loading && !error && review ? (
        <section aria-label="Monthly review summary">
          <div className="budget-summary-grid">
            <article className="budget-card">
              <h3>Income</h3>
              <p className="budget-card-value">{formatCurrency(review.income)}</p>
              <p className="field-hint">{compareHint(review.income, previous?.totalIncome ?? null)}</p>
            </article>
            <article className="budget-card">
              <h3>Expenses</h3>
              <p className="budget-card-value">{formatCurrency(review.expenses)}</p>
              <p className="field-hint">{compareHint(review.expenses, previous?.totalExpenses ?? null)}</p>
            </article>
            <article className="budget-card budget-card--hero">
              <h3>Saved</h3>
              <p className={`budget-card-value ${review.saved < 0 ? 'negative' : ''}`}>
                {formatCurrency(review.saved)}
              </p>
              <p className="field-hint">
                {compareHint(
                  review.saved,
                  previous ? previous.totalIncome - previous.totalExpenses : null,
                )}
              </p>
            </article>
            <article className="budget-card">
              <h3>Largest expense category</h3>
              <p className="budget-card-value budget-card-value--text">
                {review.largestCategory?.categoryName ?? '—'}
              </p>
              <p className="field-hint">
                {review.largestCategory
                  ? formatCurrency(review.largestCategory.total)
                  : 'No expenses this month'}
              </p>
            </article>
            <article className="budget-card">
              <h3>Largest purchase</h3>
              <p className="budget-card-value budget-card-value--text">
                {review.largestPurchaseLabel ?? '—'}
              </p>
              <p className="field-hint">
                {review.largestPurchaseAmount != null
                  ? formatCurrency(review.largestPurchaseAmount)
                  : 'No expenses this month'}
              </p>
            </article>
          </div>
        </section>
      ) : null}
    </main>
  )
}

function compareHint(current: number, previous: number | null): string {
  if (previous === null) return 'No prior month to compare'
  const delta = current - previous
  const sign = delta > 0 ? '+' : ''
  return `${sign}${formatCurrency(delta)} vs prior month`
}
