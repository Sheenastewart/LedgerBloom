import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { HowThisWorks } from '../../../components/HowThisWorks'
import { InfoTooltip } from '../../../components/InfoTooltip'
import { Button } from '../../../components/ui/Button'
import { ErrorPanel, LoadingState } from '../../../components/ui/Feedback'
import { SectionHeader } from '../../../components/ui/PageSection'
import { StatCard } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { formatCurrency, formatIsoDate } from '../../../utils/moneyUtils'
import { budgetStatus, budgetStatusLabel } from '../../budgets/budgetStatus'
import { getExpenses } from '../../expenses/api/expenseApi'
import { CALCULATION_DEFS } from '../../guidance/calculationDefs'
import { HelpLink } from '../../guidance/HelpLink'
import { getIncomeEntries } from '../../income/api/incomeApi'
import { useAuth } from '../../auth/AuthContext'
import { paths } from '../../../routes/paths'
import { getMonthlyDashboard } from '../api/dashboardApi'
import { DashboardPeriodForm } from '../components/DashboardPeriodForm'
import {
  greetingForNow,
  isWithinNextDays,
  mergeRecentActivity,
  startOfTodayIso,
} from '../dashboardPresentation'
import type { DashboardPeriod, MonthlyDashboard } from '../types'
import '../dashboard.css'
import '../../categories/categories.css'
import '../../budgets/budgets.css'
import '../../guidance/help.css'

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

function budgetTone(overBudget: boolean, percentUsed: number): 'success' | 'warning' | 'danger' | 'neutral' {
  const status = budgetStatus(overBudget, percentUsed)
  if (status === 'over-budget') return 'danger'
  if (status === 'near-budget') return 'warning'
  if (status === 'on-track') return 'success'
  return 'neutral'
}

export function DashboardPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<DashboardPeriod>(currentPeriod)
  const [dashboard, setDashboard] = useState<MonthlyDashboard | null>(null)
  const [activity, setActivity] = useState<ReturnType<typeof mergeRecentActivity>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async (nextPeriod: DashboardPeriod, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const [data, expenses, incomes] = await Promise.all([
        getMonthlyDashboard(nextPeriod, signal),
        getExpenses({ year: nextPeriod.year, month: nextPeriod.month }, signal),
        getIncomeEntries({ year: nextPeriod.year, month: nextPeriod.month }, signal),
      ])
      if (signal?.aborted) {
        return
      }
      setDashboard(data)
      setActivity(mergeRecentActivity(expenses, incomes))
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
      setActivity([])
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

  const today = startOfTodayIso()
  const greeting = useMemo(() => greetingForNow(), [])

  const billsDueThisWeek = useMemo(() => {
    if (!dashboard) return 0
    return dashboard.planning.upcomingExpenseItems
      .filter((item) => isWithinNextDays(item.nextPaymentDate, today, 7))
      .reduce((sum, item) => sum + item.amount, 0)
  }, [dashboard, today])

  const upcomingThisWeek = useMemo(() => {
    if (!dashboard) return []
    const expenses = dashboard.planning.upcomingExpenseItems
      .filter((item) => isWithinNextDays(item.nextPaymentDate, today, 7))
      .map((item) => ({
        id: `exp-${item.id}-${item.nextPaymentDate}`,
        label: item.description,
        amount: item.amount,
        date: item.nextPaymentDate,
        detail: item.categoryName,
        kind: 'payment' as const,
      }))
    const incomes = dashboard.planning.upcomingIncomeItems
      .filter((item) => isWithinNextDays(item.nextIncomeDate, today, 7))
      .map((item) => ({
        id: `inc-${item.id}-${item.nextIncomeDate}`,
        label: item.description,
        amount: item.amount,
        date: item.nextIncomeDate,
        detail: item.source,
        kind: 'income' as const,
      }))
    return [...expenses, ...incomes].sort((a, b) => a.date.localeCompare(b.date))
  }, [dashboard, today])

  const isEmptyMonth =
    dashboard !== null &&
    dashboard.incomeEntryCount === 0 &&
    dashboard.expenseEntryCount === 0

  return (
    <main className="dashboard-page page">
      <header className="greeting-block">
        <h1>
          {greeting}
          {user?.displayName ? `, ${user.displayName}` : ''}.
        </h1>
        <p>Your financial snapshot for the selected month, based on saved ledger and recurring schedules.</p>
      </header>

      <HowThisWorks>
        <p>Actual totals come from saved Income and Expense entries.</p>
        <p>Projected totals also include upcoming recurring income and recurring obligations.</p>
        <HelpLink to="/settings/help?topic=what-is-dashboard">Learn more</HelpLink>
      </HowThisWorks>

      <DashboardPeriodForm appliedPeriod={period} onApply={handleApplyPeriod} />

      {error ? <ErrorPanel onRetry={() => void loadDashboard(period)}>{error}</ErrorPanel> : null}
      {loading ? <LoadingState>Loading dashboard…</LoadingState> : null}

      {!loading && !error && dashboard ? (
        <>
          <p className="status-banner" role="status" aria-live="polite">
            Showing {periodLabel({ year: dashboard.year, month: dashboard.month })}.
          </p>

          <section aria-labelledby="snapshot-heading" className="dashboard-section">
            <SectionHeader id="snapshot-heading" title="Financial snapshot" />
            <div className="snapshot-grid">
              <StatCard label="Bills due this week" value={formatCurrency(billsDueThisWeek)} />
              <article className="stat-card">
                <h2 className="stat-card__label">Budget status</h2>
                {dashboard.budget ? (
                  <StatusBadge tone={budgetTone(dashboard.budget.overBudget, dashboard.budget.percentUsed)}>
                    {budgetStatusLabel(
                      budgetStatus(dashboard.budget.overBudget, dashboard.budget.percentUsed),
                    )}
                  </StatusBadge>
                ) : (
                  <p className="stat-card__value" style={{ fontSize: '1rem' }}>
                    No budget set
                  </p>
                )}
              </article>
              <StatCard
                label={
                  <span className="metric-heading">
                    Expected income
                    <InfoTooltip label="About expected income">{CALCULATION_DEFS.expectedIncome.short}</InfoTooltip>
                  </span>
                }
                value={formatCurrency(dashboard.planning.expectedIncome)}
              />
              <StatCard
                label={
                  <span className="metric-heading">
                    Expected obligations
                    <InfoTooltip label="About expected obligations">
                      {CALCULATION_DEFS.expectedObligations.short}
                    </InfoTooltip>
                  </span>
                }
                value={formatCurrency(dashboard.planning.expectedExpenses)}
              />
              <StatCard
                label={
                  <span className="metric-heading">
                    Projected cash flow
                    <InfoTooltip label="About projected cash flow">
                      {CALCULATION_DEFS.projectedCashFlow.short}
                    </InfoTooltip>
                  </span>
                }
                value={formatCurrency(dashboard.planning.projectedCashFlow)}
                negative={dashboard.planning.projectedCashFlow < 0}
              />
            </div>
          </section>

          <section aria-labelledby="actions-heading" className="dashboard-section">
            <SectionHeader id="actions-heading" title="What would you like to do?" />
            <div className="action-hub">
              <Link className="action-hub__card" to={paths.transactionsExpensesAdd}>
                <p className="action-hub__title">Add Expense</p>
                <p className="action-hub__desc">Record a one-time or start a recurring bill.</p>
              </Link>
              <Link className="action-hub__card" to={paths.transactionsIncomeAdd}>
                <p className="action-hub__title">Add Income</p>
                <p className="action-hub__desc">Log pay or set up recurring income.</p>
              </Link>
              <Link className="action-hub__card" to={paths.transactionsRecurringExpenseNew}>
                <p className="action-hub__title">Add Recurring Schedule</p>
                <p className="action-hub__desc">Plan subscriptions and repeating payments.</p>
              </Link>
              <Link
                className="action-hub__card"
                to={
                  dashboard.budget
                    ? paths.budgetsMonthly
                    : `/budgets/new?year=${dashboard.year}&month=${dashboard.month}`
                }
              >
                <p className="action-hub__title">Set or View Budget</p>
                <p className="action-hub__desc">Create limits or review this month’s plan.</p>
              </Link>
              <Link className="action-hub__card" to={paths.reportsMonthly}>
                <p className="action-hub__title">View Reports</p>
                <p className="action-hub__desc">Open monthly summaries and trends.</p>
              </Link>
              <Link className="action-hub__card" to={paths.transactionsRecurringExpenses}>
                <p className="action-hub__title">Review Upcoming Payments</p>
                <p className="action-hub__desc">Check recurring obligations due soon.</p>
              </Link>
            </div>
          </section>

          <section aria-labelledby="activity-heading" className="dashboard-section">
            <SectionHeader
              id="activity-heading"
              title="Activity"
              description="Recent income and expenses from the selected month."
              actions={
                <Button variant="tertiary" to={paths.transactionsExpenses}>
                  View all
                </Button>
              }
            />
            {activity.length === 0 ? (
              <p className="dashboard-empty" role="status">
                No activity recorded for this month yet.
              </p>
            ) : (
              <ul className="dashboard-compact-list">
                {activity.map((item) => (
                  <li key={item.id}>
                    <strong>{item.description}</strong> · {formatCurrency(item.amount)} ·{' '}
                    {formatIsoDate(item.date)} · {item.detail} ·{' '}
                    {item.kind === 'expense' ? 'Expense' : 'Income'}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="upcoming-heading" className="dashboard-section">
            <SectionHeader
              id="upcoming-heading"
              title="Upcoming"
              description="Recurring income and obligations due in the next 7 days."
            />
            {upcomingThisWeek.length === 0 ? (
              <p className="dashboard-empty" role="status">
                Nothing scheduled for the next 7 days in this month’s recurring plans.
              </p>
            ) : (
              <ul className="dashboard-compact-list">
                {upcomingThisWeek.map((item) => (
                  <li key={item.id}>
                    <strong>{item.label}</strong> · {formatCurrency(item.amount)} ·{' '}
                    {formatIsoDate(item.date)} · {item.detail} ·{' '}
                    {item.kind === 'payment' ? 'Payment' : 'Income'}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Monthly overview" className="dashboard-section">
            <SectionHeader title="Monthly overview" />
            {isEmptyMonth ? (
              <p className="dashboard-empty" role="status">
                No income or expense entries for this month.
              </p>
            ) : null}
            <div className="dashboard-summary-grid">
              <StatCard label="Total income" value={formatCurrency(dashboard.totalIncome)} />
              <StatCard label="Total expenses" value={formatCurrency(dashboard.totalExpenses)} />
              <StatCard
                label={
                  <span className="metric-heading">
                    Net cash flow
                    <InfoTooltip label="About net cash flow">{CALCULATION_DEFS.netCashFlow.short}</InfoTooltip>
                  </span>
                }
                value={formatCurrency(dashboard.netCashFlow)}
                negative={dashboard.netCashFlow < 0}
              />
              <StatCard label="Income entries" value={dashboard.incomeEntryCount} />
              <StatCard label="Expense entries" value={dashboard.expenseEntryCount} />
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="budget-overview-heading">
            <SectionHeader id="budget-overview-heading" title="Budget status" />
            {dashboard.budget ? (
              <div className="dashboard-summary-grid">
                <StatCard label="Total budget" value={formatCurrency(dashboard.budget.totalLimit)} />
                <StatCard
                  label={
                    <span className="metric-heading">
                      Remaining budget
                      <InfoTooltip label="About remaining budget">
                        {CALCULATION_DEFS.remainingBudget.short}
                      </InfoTooltip>
                    </span>
                  }
                  value={formatCurrency(dashboard.budget.remaining)}
                  negative={dashboard.budget.remaining < 0}
                />
                <StatCard
                  label={
                    <span className="metric-heading">
                      Percent used
                      <InfoTooltip label="About percent used">{CALCULATION_DEFS.percentUsed.short}</InfoTooltip>
                    </span>
                  }
                  value={`${dashboard.budget.percentUsed.toFixed(2)}%`}
                />
                <article className="stat-card">
                  <h2 className="stat-card__label">Budget status</h2>
                  <StatusBadge tone={budgetTone(dashboard.budget.overBudget, dashboard.budget.percentUsed)}>
                    {budgetStatusLabel(
                      budgetStatus(dashboard.budget.overBudget, dashboard.budget.percentUsed),
                    )}
                  </StatusBadge>
                </article>
              </div>
            ) : (
              <div className="status-panel" role="status">
                <p>No budget set for this month.</p>
                <Button
                  variant="secondary"
                  to={`/budgets/new?year=${dashboard.year}&month=${dashboard.month}`}
                >
                  Create budget
                </Button>
              </div>
            )}
          </section>

          <section className="dashboard-section" aria-labelledby="cash-flow-planning-heading">
            <SectionHeader
              id="cash-flow-planning-heading"
              title="Cash-flow planning"
              description="Estimates for this month based on active recurring schedules. Not a guarantee of cash received or spent."
            />
            <HelpLink to="/settings/help?topic=projected-cash-flow">How is this calculated?</HelpLink>
            <div className="dashboard-summary-grid">
              <StatCard
                label="Expected income"
                value={formatCurrency(dashboard.planning.expectedIncome)}
              />
              <StatCard
                label="Expected obligations"
                value={formatCurrency(dashboard.planning.expectedExpenses)}
              />
              <StatCard
                label="Projected cash flow"
                value={formatCurrency(dashboard.planning.projectedCashFlow)}
                negative={dashboard.planning.projectedCashFlow < 0}
              />
              <StatCard label="Upcoming income" value={dashboard.planning.upcomingIncomeCount} />
              <StatCard label="Upcoming payments" value={dashboard.planning.upcomingExpenseCount} />
            </div>

            <div className="dashboard-planning-lists">
              <div>
                <h3>Expected income breakdown</h3>
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
                <h3>Expected obligations breakdown</h3>
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
            <SectionHeader id="spending-by-category-heading" title="Spending by category" />
            {dashboard.spendingByCategory.length === 0 ? (
              <p className="dashboard-empty">No expenses in this month.</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table dashboard-table">
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
            <SectionHeader id="income-by-source-heading" title="Income by source" />
            {dashboard.incomeBySource.length === 0 ? (
              <p className="dashboard-empty">No income entries in this month.</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table dashboard-table">
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
            <SectionHeader id="largest-entries-heading" title="Largest entries" />
            <div className="dashboard-highlights">
              <article className="dashboard-highlight lb-card">
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
              <article className="dashboard-highlight lb-card">
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
