import { useCallback, useEffect, useState } from 'react'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { HowThisWorks } from '../../../components/HowThisWorks'
import { InfoTooltip } from '../../../components/InfoTooltip'
import { formatCurrency, formatIsoDate } from '../../../utils/moneyUtils'
import { budgetStatus, budgetStatusLabel } from '../../budgets/budgetStatus'
import { DashboardPeriodForm } from '../../dashboard/components/DashboardPeriodForm'
import { getMonthlyDashboard } from '../../dashboard/api/dashboardApi'
import type { DashboardPeriod, MonthlyDashboard } from '../../dashboard/types'
import { CALCULATION_DEFS } from '../../guidance/calculationDefs'
import { HelpLink } from '../../guidance/HelpLink'
import { downloadMonthlySummaryCsv, downloadMonthlyTransactionsCsv, saveCsvDownload } from '../api/exportsApi'
import { getMonthlyComparison } from '../api/reportsApi'
import { TrendsTable } from '../components/TrendsTable'
import { currentPeriod, monthLabel } from '../reportsFormat'
import type { MonthlyComparisonItem } from '../types'
import '../reports.css'
import '../../guidance/help.css'

type DownloadTarget = 'transactions' | 'summary' | null

export function MonthlyReportPage() {
  const [period, setPeriod] = useState<DashboardPeriod>(currentPeriod)
  const [dashboard, setDashboard] = useState<MonthlyDashboard | null>(null)
  const [comparisonItem, setComparisonItem] = useState<MonthlyComparisonItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<DownloadTarget>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const loadReport = useCallback(async (nextPeriod: DashboardPeriod, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const [dashboardData, comparison] = await Promise.all([
        getMonthlyDashboard(nextPeriod, signal),
        getMonthlyComparison(
          {
            startYear: nextPeriod.year,
            startMonth: nextPeriod.month,
            endYear: nextPeriod.year,
            endMonth: nextPeriod.month,
          },
          signal,
        ),
      ])
      if (signal?.aborted) {
        return
      }
      setDashboard(dashboardData)
      setComparisonItem(comparison.months[0] ?? null)
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) {
        return
      }
      if (err instanceof ApiClientError && err.code === 'INVALID_REQUEST') {
        setError(err.message)
      } else if (err instanceof ApiClientError && err.code === 'INVALID_REPORT_PERIOD') {
        setError(err.message)
      } else {
        setError('Unable to load the monthly report. Please try again.')
      }
      setDashboard(null)
      setComparisonItem(null)
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadReport(period, controller.signal)
    return () => controller.abort()
  }, [loadReport, period])

  function handleApplyPeriod(nextPeriod: DashboardPeriod) {
    if (nextPeriod.year === period.year && nextPeriod.month === period.month) {
      void loadReport(nextPeriod)
      return
    }
    setPeriod(nextPeriod)
  }

  async function handleDownload(kind: 'transactions' | 'summary') {
    setDownloadError(null)
    setDownloading(kind)
    try {
      const download =
        kind === 'transactions'
          ? await downloadMonthlyTransactionsCsv(period.year, period.month)
          : await downloadMonthlySummaryCsv(period.year, period.month)
      saveCsvDownload(download)
    } catch (err) {
      if (isAbortError(err)) {
        return
      }
      setDownloadError('Unable to generate the CSV export. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  const isEmptyMonth =
    dashboard !== null && dashboard.incomeEntryCount === 0 && dashboard.expenseEntryCount === 0

  return (
    <main className="reports-page monthly-report-page page">
      <div className="page-header no-print">
        <div>
          <h1>Monthly report</h1>
          <p className="page-subtitle">A printable summary of a single month's finances.</p>
        </div>
        <button type="button" className="button button-primary" onClick={() => window.print()}>
          Print report
        </button>
      </div>

      <HowThisWorks>
        <p>
          Actual totals come from saved Income and Expense entries. Cash flow planning also
          includes expected recurring income and obligations for the selected month.
        </p>
        <HelpLink to="/settings/help?topic=print-monthly-report">How do I print or save as PDF?</HelpLink>
      </HowThisWorks>

      <div className="no-print">
        <DashboardPeriodForm appliedPeriod={period} onApply={handleApplyPeriod} />
      </div>

      {error ? (
        <div className="status-panel no-print" role="alert">
          <p>{error}</p>
          <button type="button" className="button button-secondary" onClick={() => void loadReport(period)}>
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="status-banner no-print" role="status" aria-live="polite">
          Loading monthly report…
        </p>
      ) : null}

      {!loading && !error && dashboard ? (
        <>
          <p className="status-banner no-print" role="status" aria-live="polite">
            Showing {monthLabel({ year: dashboard.year, month: dashboard.month })}.
          </p>

          <div className="print-only report-print-header">
            <h1>LedgerBloom monthly report</h1>
            <p>{monthLabel({ year: dashboard.year, month: dashboard.month })}</p>
            <p className="page-subtitle">Printed {new Date().toLocaleDateString()}</p>
          </div>

          {isEmptyMonth ? (
            <p className="dashboard-empty" role="status">
              No income or expense entries for this month.
            </p>
          ) : null}

          <section className="reports-section" aria-label="Monthly summary">
            <div className="reports-summary-grid">
              <article className="reports-card">
                <h2>Total income</h2>
                <p className="reports-card-value">{formatCurrency(dashboard.totalIncome)}</p>
              </article>
              <article className="reports-card">
                <h2>Total expenses</h2>
                <p className="reports-card-value">{formatCurrency(dashboard.totalExpenses)}</p>
              </article>
              <article className="reports-card">
                <h2>Net cash flow</h2>
                <p
                  className={
                    dashboard.netCashFlow < 0 ? 'reports-card-value negative' : 'reports-card-value'
                  }
                >
                  {formatCurrency(dashboard.netCashFlow)}
                </p>
              </article>
              <article className="reports-card">
                <h2>Income entries</h2>
                <p className="reports-card-value">{dashboard.incomeEntryCount}</p>
              </article>
              <article className="reports-card">
                <h2>Expense entries</h2>
                <p className="reports-card-value">{dashboard.expenseEntryCount}</p>
              </article>
            </div>
          </section>

          <section className="reports-section" aria-labelledby="monthly-budget-heading">
            <h2 id="monthly-budget-heading">Budget</h2>
            {dashboard.budget ? (
              <div className="reports-summary-grid">
                <article className="reports-card">
                  <h2>Total budget</h2>
                  <p className="reports-card-value">{formatCurrency(dashboard.budget.totalLimit)}</p>
                </article>
                <article className="reports-card">
                  <h2>Remaining</h2>
                  <p
                    className={
                      dashboard.budget.remaining < 0
                        ? 'reports-card-value negative'
                        : 'reports-card-value'
                    }
                  >
                    {formatCurrency(dashboard.budget.remaining)}
                  </p>
                </article>
                <article className="reports-card">
                  <h2>Percent used</h2>
                  <p className="reports-card-value">{dashboard.budget.percentUsed.toFixed(2)}%</p>
                </article>
                <article className="reports-card">
                  <h2>Status</h2>
                  <p
                    className={`budget-status ${budgetStatus(
                      dashboard.budget.overBudget,
                      dashboard.budget.percentUsed,
                    )}`}
                  >
                    {budgetStatusLabel(
                      budgetStatus(dashboard.budget.overBudget, dashboard.budget.percentUsed),
                    )}
                  </p>
                </article>
              </div>
            ) : (
              <p className="dashboard-empty">No budget set for this month.</p>
            )}
          </section>

          <section className="reports-section" aria-labelledby="monthly-planning-heading">
            <h2 id="monthly-planning-heading">Cash flow planning</h2>
            <div className="reports-summary-grid">
              <article className="reports-card">
                <h2 className="metric-heading">
                  Expected income
                  <InfoTooltip label="About expected income">
                    {CALCULATION_DEFS.expectedIncome.short}
                  </InfoTooltip>
                </h2>
                <p className="reports-card-value">{formatCurrency(dashboard.planning.expectedIncome)}</p>
              </article>
              <article className="reports-card">
                <h2 className="metric-heading">
                  Expected obligations
                  <InfoTooltip label="About expected obligations">
                    {CALCULATION_DEFS.expectedObligations.short}
                  </InfoTooltip>
                </h2>
                <p className="reports-card-value">
                  {formatCurrency(dashboard.planning.expectedExpenses)}
                </p>
              </article>
              <article className="reports-card">
                <h2 className="metric-heading">
                  Projected cash flow
                  <InfoTooltip label="About projected cash flow">
                    {CALCULATION_DEFS.projectedCashFlow.short}
                  </InfoTooltip>
                </h2>
                <p
                  className={
                    dashboard.planning.projectedCashFlow < 0
                      ? 'reports-card-value negative'
                      : 'reports-card-value'
                  }
                >
                  {formatCurrency(dashboard.planning.projectedCashFlow)}
                </p>
              </article>
            </div>

            <div className="dashboard-planning-lists">
              <div>
                <h3>Upcoming income</h3>
                {dashboard.planning.upcomingIncomeItems.length === 0 ? (
                  <p className="dashboard-empty" role="status">
                    No scheduled recurring income in this month.
                  </p>
                ) : (
                  <ul className="dashboard-compact-list">
                    {dashboard.planning.upcomingIncomeItems.map((item) => (
                      <li key={item.id}>
                        <strong>{item.description}</strong> · {formatCurrency(item.amount)} ·{' '}
                        {formatIsoDate(item.nextIncomeDate)} · {item.source}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3>Upcoming obligations</h3>
                {dashboard.planning.upcomingExpenseItems.length === 0 ? (
                  <p className="dashboard-empty" role="status">
                    No scheduled recurring payments in this month.
                  </p>
                ) : (
                  <ul className="dashboard-compact-list">
                    {dashboard.planning.upcomingExpenseItems.map((item) => (
                      <li key={item.id}>
                        <strong>{item.description}</strong> · {formatCurrency(item.amount)} ·{' '}
                        {formatIsoDate(item.nextPaymentDate)} · {item.categoryName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section className="reports-section" aria-labelledby="monthly-category-heading">
            <h2 id="monthly-category-heading">Spending by category</h2>
            {dashboard.spendingByCategory.length === 0 ? (
              <p className="dashboard-empty">No expenses in this month.</p>
            ) : (
              <div className="reports-table-wrap">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th scope="col">Category</th>
                      <th scope="col" className="numeric">
                        Entries
                      </th>
                      <th scope="col" className="numeric">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.spendingByCategory.map((row) => (
                      <tr key={row.categoryId}>
                        <th scope="row">{row.categoryName}</th>
                        <td className="numeric">{row.entryCount}</td>
                        <td className="numeric">{formatCurrency(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="reports-section" aria-labelledby="monthly-source-heading">
            <h2 id="monthly-source-heading">Income by source</h2>
            {dashboard.incomeBySource.length === 0 ? (
              <p className="dashboard-empty">No income entries in this month.</p>
            ) : (
              <div className="reports-table-wrap">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th scope="col">Source</th>
                      <th scope="col" className="numeric">
                        Entries
                      </th>
                      <th scope="col" className="numeric">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.incomeBySource.map((row) => (
                      <tr key={row.source.toLowerCase()}>
                        <th scope="row">{row.source}</th>
                        <td className="numeric">{row.entryCount}</td>
                        <td className="numeric">{formatCurrency(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="reports-section" aria-labelledby="monthly-largest-heading">
            <h2 id="monthly-largest-heading">Largest entries</h2>
            <div className="dashboard-highlights">
              <article className="dashboard-highlight">
                <h3 className="label">Largest income</h3>
                {dashboard.largestIncome ? (
                  <>
                    <p className="amount">{formatCurrency(dashboard.largestIncome.amount)}</p>
                    <p>
                      {dashboard.largestIncome.description} · {dashboard.largestIncome.source}
                    </p>
                    <p className="label">{formatIsoDate(dashboard.largestIncome.incomeDate)}</p>
                  </>
                ) : (
                  <p className="dashboard-empty">No income entries this month.</p>
                )}
              </article>
              <article className="dashboard-highlight">
                <h3 className="label">Largest expense</h3>
                {dashboard.largestExpense ? (
                  <>
                    <p className="amount">{formatCurrency(dashboard.largestExpense.amount)}</p>
                    <p>
                      {dashboard.largestExpense.description} · {dashboard.largestExpense.categoryName}
                    </p>
                    <p className="label">{formatIsoDate(dashboard.largestExpense.expenseDate)}</p>
                  </>
                ) : (
                  <p className="dashboard-empty">No expense entries this month.</p>
                )}
              </article>
            </div>
          </section>

          {comparisonItem ? (
            <section className="reports-section" aria-labelledby="monthly-summary-row-heading">
              <h2 id="monthly-summary-row-heading">Report summary</h2>
              <TrendsTable months={[comparisonItem]} caption="Single month report summary" />
            </section>
          ) : null}

          <section className="reports-section no-print" aria-labelledby="monthly-exports-heading">
            <h2 id="monthly-exports-heading">CSV exports</h2>
            {downloadError ? (
              <p className="form-error" role="alert">
                {downloadError}
              </p>
            ) : null}
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
          </section>
        </>
      ) : null}
    </main>
  )
}
