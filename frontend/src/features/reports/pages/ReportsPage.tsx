import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { downloadMonthlySummaryCsv, downloadMonthlyTransactionsCsv, saveCsvDownload } from '../api/exportsApi'
import { ReportsNav } from '../components/ReportsNav'
import { currentPeriod } from '../reportsFormat'
import '../reports.css'

type DownloadTarget = 'transactions' | 'summary' | null

export function ReportsPage() {
  const initialPeriod = currentPeriod()
  const [year, setYear] = useState(String(initialPeriod.year))
  const [month, setMonth] = useState(String(initialPeriod.month))
  const [downloading, setDownloading] = useState<DownloadTarget>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function parsePeriod(): { year: number; month: number } | null {
    const yearValue = Number(year)
    const monthValue = Number(month)
    if (!Number.isInteger(yearValue) || yearValue < 1 || yearValue > 9999) {
      setError('Enter a valid year between 1 and 9999.')
      return null
    }
    if (!Number.isInteger(monthValue) || monthValue < 1 || monthValue > 12) {
      setError('Select a valid month.')
      return null
    }
    return { year: yearValue, month: monthValue }
  }

  async function handleDownload(kind: 'transactions' | 'summary') {
    setError(null)
    setSuccessMessage(null)
    const period = parsePeriod()
    if (!period) {
      return
    }
    setDownloading(kind)
    try {
      const download =
        kind === 'transactions'
          ? await downloadMonthlyTransactionsCsv(period.year, period.month)
          : await downloadMonthlySummaryCsv(period.year, period.month)
      saveCsvDownload(download)
      setSuccessMessage(`Downloaded ${download.filename}.`)
    } catch (err) {
      if (isAbortError(err)) {
        return
      }
      if (err instanceof ApiClientError && err.code === 'INVALID_REPORT_PERIOD') {
        setError(err.message)
      } else {
        setError('Unable to generate the CSV export. Please try again.')
      }
    } finally {
      setDownloading(null)
    }
  }

  return (
    <main className="reports-page page">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="page-subtitle">Trends, year-to-date totals, printable monthly reports, and CSV exports.</p>
        </div>
      </div>

      <ReportsNav />

      <div className="reports-overview-grid">
        <article className="reports-overview-card">
          <h2>Trends</h2>
          <p>Compare income, expenses, and cash flow across a custom range of months.</p>
          <Link to="/reports/trends" className="button button-primary">
            View trends
          </Link>
        </article>
        <article className="reports-overview-card">
          <h2>Year-to-date</h2>
          <p>See totals, averages, and highlights for an entire year.</p>
          <Link to="/reports/year-to-date" className="button button-primary">
            View year-to-date
          </Link>
        </article>
        <article className="reports-overview-card">
          <h2>Monthly report</h2>
          <p>A printable summary of a single month's finances.</p>
          <Link to="/reports/monthly" className="button button-primary">
            View monthly report
          </Link>
        </article>
      </div>

      <section className="reports-section" aria-labelledby="csv-exports-heading">
        <h2 id="csv-exports-heading">CSV exports</h2>
        <p className="page-subtitle">Download a month's transactions or summary as a CSV file.</p>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        {successMessage ? (
          <p className="status-banner success" role="status" aria-live="polite">
            {successMessage}
          </p>
        ) : null}

        <div className="exports-panel">
          <div className="field">
            <label htmlFor="export-month">Month</label>
            <select id="export-month" value={month} onChange={(event) => setMonth(event.target.value)}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="export-year">Year</label>
            <input
              id="export-year"
              type="number"
              inputMode="numeric"
              min={1}
              max={9999}
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </div>
          <div className="exports-panel-actions">
            <button
              type="button"
              className="button button-secondary"
              disabled={downloading !== null}
              onClick={() => void handleDownload('transactions')}
            >
              {downloading === 'transactions' ? 'Downloading…' : 'Download transactions CSV'}
            </button>
            <button
              type="button"
              className="button button-secondary"
              disabled={downloading !== null}
              onClick={() => void handleDownload('summary')}
            >
              {downloading === 'summary' ? 'Downloading…' : 'Download summary CSV'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
