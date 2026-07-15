import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { getYearToDate } from '../api/reportsApi'
import { ReportsNav } from '../components/ReportsNav'
import { YtdSummary } from '../components/YtdSummary'
import { currentPeriod } from '../reportsFormat'
import type { YearToDateResponse } from '../types'
import '../reports.css'

export function YtdPage() {
  const [year, setYear] = useState(() => currentPeriod().year)
  const [yearInput, setYearInput] = useState(() => String(currentPeriod().year))
  const [data, setData] = useState<YearToDateResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadYtd = useCallback(async (nextYear: number, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getYearToDate(nextYear, signal)
      if (signal?.aborted) {
        return
      }
      setData(result)
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) {
        return
      }
      if (err instanceof ApiClientError && err.code === 'INVALID_REPORT_PERIOD') {
        setError(err.message)
      } else {
        setError('Unable to load the year-to-date report. Please try again.')
      }
      setData(null)
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadYtd(year, controller.signal)
    return () => controller.abort()
  }, [loadYtd, year])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = Number(yearInput.trim())
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 9999) {
      setError('Enter a valid year between 1 and 9999.')
      return
    }
    if (parsed === year) {
      void loadYtd(parsed)
      return
    }
    setYear(parsed)
  }

  const isEmptyYear =
    data !== null && data.monthSummaries.every((item) => item.incomeCount === 0 && item.expenseCount === 0)

  return (
    <main className="reports-page page">
      <div className="page-header">
        <div>
          <h1>Year-to-date</h1>
          <p className="page-subtitle">Totals, averages, and highlights for a full year.</p>
        </div>
      </div>

      <ReportsNav />

      <form className="month-range-form" onSubmit={handleSubmit} noValidate>
        <fieldset>
          <legend>Report year</legend>
          <div className="field">
            <label htmlFor="ytd-year">Year</label>
            <input
              id="ytd-year"
              type="number"
              inputMode="numeric"
              min={1}
              max={9999}
              value={yearInput}
              onChange={(event) => setYearInput(event.target.value)}
            />
          </div>
          <div className="month-range-actions">
            <button type="submit" className="button button-primary">
              Apply
            </button>
          </div>
        </fieldset>
      </form>

      {error ? (
        <div className="status-panel" role="alert">
          <p>{error}</p>
          <button type="button" className="button button-secondary" onClick={() => void loadYtd(year)}>
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="status-banner" role="status" aria-live="polite">
          Loading year-to-date report…
        </p>
      ) : null}

      {!loading && !error && data ? (
        <>
          <p className="status-banner" role="status" aria-live="polite">
            Showing {data.year}.
          </p>

          {isEmptyYear ? (
            <p className="dashboard-empty" role="status">
              No income or expense entries recorded for {data.year}.
            </p>
          ) : null}

          <YtdSummary data={data} />
        </>
      ) : null}
    </main>
  )
}
