import { useState } from 'react'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { HowThisWorks } from '../../../components/HowThisWorks'
import { InfoTooltip } from '../../../components/InfoTooltip'
import { HelpLink } from '../../guidance/HelpLink'
import { downloadMonthlySummaryCsv, downloadMonthlyTransactionsCsv, saveCsvDownload } from '../api/exportsApi'
import { currentPeriod } from '../reportsFormat'
import '../reports.css'
import '../../guidance/help.css'
import { paths } from '../../../routes/paths'

type DownloadTarget = 'transactions' | 'summary' | null

/** CSV export tools previously hosted on the reports overview page. */
export function ExportsPage() {
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
          <h1>Exports</h1>
          <p className="page-subtitle">Download a month&apos;s transactions or summary as CSV.</p>
        </div>
      </div>

      <HowThisWorks>
        <p>
          CSV exports include saved ledger rows for the selected month. Risky leading characters are
          neutralized to reduce spreadsheet formula injection risk.
        </p>
        <HelpLink to={`${paths.settingsHelp}?topic=export-csv`}>Learn more about CSV exports</HelpLink>
      </HowThisWorks>

      <section className="reports-section" aria-labelledby="csv-exports-heading">
        <h2 id="csv-exports-heading" className="metric-heading">
          CSV exports
          <InfoTooltip label="About CSV exports">
            Download monthly transactions or a monthly summary as CSV. Risky leading characters are
            neutralized to reduce spreadsheet formula injection risk.
          </InfoTooltip>
        </h2>

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
