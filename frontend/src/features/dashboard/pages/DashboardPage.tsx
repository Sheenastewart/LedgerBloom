import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { formatCurrency, formatIsoDate } from '../../../utils/moneyUtils'
import { budgetStatus, budgetStatusLabel } from '../../budgets/budgetStatus'
import { getMonthlyDashboard } from '../api/dashboardApi'
import { DashboardPeriodForm } from '../components/DashboardPeriodForm'
import type { DashboardPeriod, MonthlyDashboard } from '../types'
import '../dashboard.css'
import '../../categories/categories.css'
import '../../budgets/budgets.css'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

function currentPeriod(): DashboardPeriod {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

function periodLabel(period: DashboardPeriod): string {
  return `${MONTH_NAMES[period.month - 1]} ${period.year}`
}

export function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>(currentPeriod)
  const [dashboard, setDashboard] = useState<MonthlyDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async (nextPeriod: DashboardPeriod, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMonthlyDashboard(nextPeriod, signal)
      if (signal?.aborted) {
        return
      }
      setDashboard(data)
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) {
        return
      }
      if (err instanceof ApiClientError && err.code === 'INVALID_REQUEST') {
        setError(err.message)
      } else {
        setError('Unable to load the monthly dashboard. Please try again.')
      }
      setDashboard(null)
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadDashboard(period, controller.signal)
    return () => controller.abort()
  }, [loadDashboard, period])

  function handleApplyPeriod(nextPeriod: DashboardPeriod) {
    if (nextPeriod.year === period.year && nextPeriod.month === period.month) {
      void loadDashboard(nextPeriod)
      return
    }
    setPeriod(nextPeriod)
  }

  const isEmptyMonth =
    dashboard !== null &&
    dashboard.incomeEntryCount === 0 &&
    dashboard.expenseEntryCount === 0

  return (
    <main className="dashboard-page page">
      <div className="dashboard-header">
        <h1>Monthly dashboard</h1>
        <p>Income and expense totals for a selected month.</p>
      </div>

      <DashboardPeriodForm appliedPeriod={period} onApply={handleApplyPeriod} />

      {error ? (
        <div className="status-panel" role="alert">
          <p>{error}</p>
          <button type="button" className="button button-secondary" onClick={() => void loadDashboard(period)}>
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="status-banner" role="status" aria-live="polite">
          Loading dashboard…
        </p>
      ) : null}

      {!loading && !error && dashboard ? (
        <>
          <p className="status-banner" role="status" aria-live="polite">
            Showing {periodLabel({ year: dashboard.year, month: dashboard.month })}.
          </p>

          {isEmptyMonth ? (
            <p className="dashboard-empty" role="status">
              No income or expense entries for this month.
            </p>
          ) : null}

          <section aria-label="Monthly summary">
            <div className="dashboard-summary-grid">
              <article className="dashboard-card">
                <h2>Total income</h2>
                <p className="dashboard-card-value">{formatCurrency(dashboard.totalIncome)}</p>
              </article>
              <article className="dashboard-card">
                <h2>Total expenses</h2>
                <p className="dashboard-card-value">{formatCurrency(dashboard.totalExpenses)}</p>
              </article>
              <article className="dashboard-card">
                <h2>Net cash flow</h2>
                <p
                  className={
                    dashboard.netCashFlow < 0
                      ? 'dashboard-card-value negative'
                      : 'dashboard-card-value'
                  }
                >
                  {formatCurrency(dashboard.netCashFlow)}
                </p>
              </article>
              <article className="dashboard-card">
                <h2>Income entries</h2>
                <p className="dashboard-card-value">{dashboard.incomeEntryCount}</p>
              </article>
              <article className="dashboard-card">
                <h2>Expense entries</h2>
                <p className="dashboard-card-value">{dashboard.expenseEntryCount}</p>
              </article>
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="budget-overview-heading">
            <h2 id="budget-overview-heading">Budget overview</h2>
            {dashboard.budget ? (
              <div className="dashboard-summary-grid">
                <article className="dashboard-card">
                  <h2>Total budget</h2>
                  <p className="dashboard-card-value">{formatCurrency(dashboard.budget.totalLimit)}</p>
                </article>
                <article className="dashboard-card">
                  <h2>Remaining budget</h2>
                  <p
                    className={
                      dashboard.budget.remaining < 0
                        ? 'dashboard-card-value negative'
                        : 'dashboard-card-value'
                    }
                  >
                    {formatCurrency(dashboard.budget.remaining)}
                  </p>
                </article>
                <article className="dashboard-card">
                  <h2>Percent used</h2>
                  <p className="dashboard-card-value">{dashboard.budget.percentUsed.toFixed(2)}%</p>
                </article>
                <article className="dashboard-card">
                  <h2>Budget status</h2>
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
              <div className="status-panel" role="status">
                <p>No budget set for this month.</p>
                <Link
                  to={`/budgets/new?year=${dashboard.year}&month=${dashboard.month}`}
                  className="button button-secondary"
                >
                  Create budget
                </Link>
              </div>
            )}
          </section>

          <section className="dashboard-section" aria-labelledby="cash-flow-planning-heading">
            <h2 id="cash-flow-planning-heading">Cash Flow Planning</h2>
            <p className="page-subtitle">
              Estimates for this month based on active recurring schedules. Not a guarantee of cash
              received or spent.
            </p>
            <div className="dashboard-summary-grid">
              <article className="dashboard-card">
                <h2>Expected income</h2>
                <p className="dashboard-card-value">
                  {formatCurrency(dashboard.planning.expectedIncome)}
                </p>
              </article>
              <article className="dashboard-card">
                <h2>Expected obligations</h2>
                <p className="dashboard-card-value">
                  {formatCurrency(dashboard.planning.expectedExpenses)}
                </p>
              </article>
              <article className="dashboard-card">
                <h2>Projected cash flow</h2>
                <p
                  className={
                    dashboard.planning.projectedCashFlow < 0
                      ? 'dashboard-card-value negative'
                      : 'dashboard-card-value'
                  }
                >
                  {formatCurrency(dashboard.planning.projectedCashFlow)}
                </p>
              </article>
              <article className="dashboard-card">
                <h2>Upcoming income</h2>
                <p className="dashboard-card-value">{dashboard.planning.upcomingIncomeCount}</p>
              </article>
              <article className="dashboard-card">
                <h2>Upcoming payments</h2>
                <p className="dashboard-card-value">{dashboard.planning.upcomingExpenseCount}</p>
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

          <section className="dashboard-section" aria-labelledby="spending-by-category-heading">
            <h2 id="spending-by-category-heading">Spending by category</h2>
            {dashboard.spendingByCategory.length === 0 ? (
              <p className="dashboard-empty">No expenses in this month.</p>
            ) : (
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
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

          <section className="dashboard-section" aria-labelledby="income-by-source-heading">
            <h2 id="income-by-source-heading">Income by source</h2>
            {dashboard.incomeBySource.length === 0 ? (
              <p className="dashboard-empty">No income entries in this month.</p>
            ) : (
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
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

          <section className="dashboard-section" aria-labelledby="largest-entries-heading">
            <h2 id="largest-entries-heading">Largest entries</h2>
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
        </>
      ) : null}
    </main>
  )
}
