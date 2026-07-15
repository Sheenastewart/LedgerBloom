import { useCallback, useEffect, useState } from 'react'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { getMonthlyComparison } from '../api/reportsApi'
import { MonthRangeForm } from '../components/MonthRangeForm'
import { ReportsNav } from '../components/ReportsNav'
import { TrendsTable } from '../components/TrendsTable'
import { lastSixMonthsRange, monthLabel } from '../reportsFormat'
import type { MonthlyComparisonResponse, MonthRange } from '../types'
import '../reports.css'

const DEFAULT_RANGE = lastSixMonthsRange()

function rangeLabel(range: MonthRange): string {
  return `${monthLabel({ year: range.startYear, month: range.startMonth })} – ${monthLabel({
    year: range.endYear,
    month: range.endMonth,
  })}`
}

export function TrendsPage() {
  const [range, setRange] = useState<MonthRange>(DEFAULT_RANGE)
  const [comparison, setComparison] = useState<MonthlyComparisonResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadComparison = useCallback(async (nextRange: MonthRange, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMonthlyComparison(nextRange, signal)
      if (signal?.aborted) {
        return
      }
      setComparison(data)
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) {
        return
      }
      if (err instanceof ApiClientError && (err.code === 'INVALID_REPORT_PERIOD' || err.code === 'REPORT_RANGE_TOO_LARGE')) {
        setError(err.message)
      } else {
        setError('Unable to load trends. Please try again.')
      }
      setComparison(null)
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadComparison(range, controller.signal)
    return () => controller.abort()
  }, [loadComparison, range])

  function handleApplyRange(nextRange: MonthRange) {
    if (
      nextRange.startYear === range.startYear &&
      nextRange.startMonth === range.startMonth &&
      nextRange.endYear === range.endYear &&
      nextRange.endMonth === range.endMonth
    ) {
      void loadComparison(nextRange)
      return
    }
    setRange(nextRange)
  }

  const isEmptyRange =
    comparison !== null &&
    comparison.months.every((item) => item.incomeCount === 0 && item.expenseCount === 0)

  return (
    <main className="reports-page page">
      <div className="page-header">
        <div>
          <h1>Trends</h1>
          <p className="page-subtitle">Compare income, expenses, and cash flow across a range of months.</p>
        </div>
      </div>

      <ReportsNav />

      <MonthRangeForm appliedRange={range} defaultRange={DEFAULT_RANGE} onApply={handleApplyRange} />

      {error ? (
        <div className="status-panel" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => void loadComparison(range)}
          >
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="status-banner" role="status" aria-live="polite">
          Loading trends…
        </p>
      ) : null}

      {!loading && !error && comparison ? (
        <>
          <p className="status-banner" role="status" aria-live="polite">
            Showing {rangeLabel(range)} (
            {comparison.monthCount === 1
              ? '1 month'
              : `${comparison.monthCount} months`}
            ).
          </p>

          {isEmptyRange ? (
            <p className="dashboard-empty" role="status">
              No income or expense entries in this range.
            </p>
          ) : null}

          {comparison.months.length === 0 ? (
            <p className="dashboard-empty" role="status">
              No months to display for this range.
            </p>
          ) : (
            <TrendsTable months={comparison.months} caption="Monthly trends comparison" />
          )}
        </>
      ) : null}
    </main>
  )
}
