import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { ActivityRowList } from '../../../components/ActivityRowList'
import { HowThisWorks } from '../../../components/HowThisWorks'
import { InfoTooltip } from '../../../components/InfoTooltip'
import { Button } from '../../../components/ui/Button'
import { ErrorPanel, LoadingState } from '../../../components/ui/Feedback'
import { formatCurrency, formatIsoDate } from '../../../utils/moneyUtils'
import { getExpenses } from '../../expenses/api/expenseApi'
import { CALCULATION_DEFS } from '../../guidance/calculationDefs'
import { HelpLink } from '../../guidance/HelpLink'
import { getIncomeEntries } from '../../income/api/incomeApi'
import { useAuth } from '../../auth/AuthContext'
import { paths } from '../../../routes/paths'
import { markRecurringExpensePaid } from '../../recurring/api/recurringApi'
import { markRecurringIncomeReceived } from '../../recurringIncome/api/recurringIncomeApi'
import { getMonthlyDashboard } from '../api/dashboardApi'
import { DashboardPeriodForm } from '../components/DashboardPeriodForm'
import {
  activityItemsToRows,
  buildAgenda,
  greetingForNow,
  isWithinNextDays,
  mergeRecentActivity,
  safeToSpend,
  startOfTodayIso,
  type AgendaItem,
} from '../dashboardPresentation'
import type { DashboardPeriod, MonthlyDashboard } from '../types'
import '../dashboard.css'
import '../../guidance/help.css'
import './dashboardPolish.css'

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
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

function periodLabel(period: DashboardPeriod): string {
  return `${MONTH_NAMES[period.month - 1]} ${period.year}`
}

const AGENDA_SECTIONS: Array<{ key: AgendaItem['group']; title: string }> = [
  { key: 'overdue', title: 'Overdue' },
  { key: 'today', title: 'Today' },
  { key: 'tomorrow', title: 'Tomorrow' },
  { key: 'week', title: 'This week' },
]

export function DashboardPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<DashboardPeriod>(currentPeriod)
  const [dashboard, setDashboard] = useState<MonthlyDashboard | null>(null)
  const [activity, setActivity] = useState<ReturnType<typeof mergeRecentActivity>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)
  const [projectedIncomeOpen, setProjectedIncomeOpen] = useState(false)
  const projectedIncomePanelId = useId()

  const loadDashboard = useCallback(async (nextPeriod: DashboardPeriod, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const [data, expenses, incomes] = await Promise.all([
        getMonthlyDashboard(nextPeriod, signal),
        getExpenses({ year: nextPeriod.year, month: nextPeriod.month }, signal),
        getIncomeEntries({ year: nextPeriod.year, month: nextPeriod.month }, signal),
      ])
      if (signal?.aborted) return
      setDashboard(data)
      setActivity(mergeRecentActivity(expenses, incomes))
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) return
      if (err instanceof ApiClientError && err.code === 'INVALID_REQUEST') {
        setError(err.message)
      } else {
        setError('Unable to load the monthly dashboard. Please try again.')
      }
      setDashboard(null)
      setActivity([])
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadDashboard(period, controller.signal)
    return () => controller.abort()
  }, [loadDashboard, period])

  function handleApplyPeriod(nextPeriod: DashboardPeriod) {
    setProjectedIncomeOpen(false)
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

  const projectedIncome = useMemo(() => {
    if (!dashboard) return 0
    return dashboard.totalIncome + dashboard.planning.expectedIncome
  }, [dashboard])

  const remainingBudget = dashboard?.budget?.remaining ?? null
  const safeSpend = safeToSpend(remainingBudget, billsDueThisWeek)

  const agenda = useMemo(() => {
    if (!dashboard) return []
    return buildAgenda({
      expenseItems: dashboard.planning.upcomingExpenseItems,
      incomeItems: dashboard.planning.upcomingIncomeItems,
      todayIso: today,
    })
  }, [dashboard, today])

  const activityRows = useMemo(() => activityItemsToRows(activity), [activity])

  async function handleAgendaAction(item: AgendaItem) {
    setActionError(null)
    setActionBusyId(item.id)
    try {
      if (item.kind === 'payment') {
        await markRecurringExpensePaid(item.scheduleId, {
          expectedNextPaymentDate: item.date,
        })
      } else {
        await markRecurringIncomeReceived(item.scheduleId, {
          expectedNextIncomeDate: item.date,
        })
      }
      await loadDashboard(period)
    } catch (err) {
      if (err instanceof ApiClientError) {
        setActionError(err.message)
      } else {
        setActionError('Unable to update that schedule. Please try again.')
      }
    } finally {
      setActionBusyId(null)
    }
  }

  return (
    <main className="dashboard-page page dashboard-page--decision">
      <header className="greeting-block">
        <h1>
          {greeting}
          {user?.displayName ? `, ${user.displayName}` : ''}.
        </h1>
        <p className="greeting-block__sub">Am I financially okay this month?</p>
      </header>

      <div className="dashboard-toolbar">
        <DashboardPeriodForm appliedPeriod={period} onApply={handleApplyPeriod} />
        <HowThisWorks>
          <p>Actual totals come from saved Income and Expense entries.</p>
          <p>Projected income adds upcoming recurring income only — not expenses.</p>
          <HelpLink to="/settings/help?topic=what-is-dashboard">Learn more</HelpLink>
        </HowThisWorks>
      </div>

      {error ? <ErrorPanel onRetry={() => void loadDashboard(period)}>{error}</ErrorPanel> : null}
      {loading ? <LoadingState>Loading dashboard…</LoadingState> : null}
      {actionError ? (
        <p className="status-banner warning" role="alert">
          {actionError}
        </p>
      ) : null}

      {!loading && !error && dashboard ? (
        <>
          <p className="period-chip" role="status">
            {periodLabel({ year: dashboard.year, month: dashboard.month })}
          </p>

          <section className="decision-fold" aria-label="Financial decision snapshot">
            <div className="hero-metric-wrap">
              <p className="hero-metric__label">
                Projected income
                <InfoTooltip label="About projected income">
                  Recorded income plus expected recurring income for this month.
                </InfoTooltip>
              </p>
              <button
                type="button"
                className="hero-metric"
                aria-expanded={projectedIncomeOpen}
                aria-controls={projectedIncomePanelId}
                aria-label="Projected income"
                onClick={() => setProjectedIncomeOpen((open) => !open)}
              >
                <span className="hero-metric__value">{formatCurrency(projectedIncome)}</span>
                <span className="hero-metric__hint">
                  {projectedIncomeOpen ? 'Hide breakdown' : 'View breakdown'}
                </span>
              </button>
            </div>

            {projectedIncomeOpen ? (
              <div id={projectedIncomePanelId} className="hero-metric__panel">
                <ul className="metric-breakdown">
                  <li>
                    <span>Recorded income</span>
                    <strong>{formatCurrency(dashboard.totalIncome)}</strong>
                  </li>
                  <li>
                    <span>Expected recurring income</span>
                    <strong>{formatCurrency(dashboard.planning.expectedIncome)}</strong>
                  </li>
                  <li>
                    <span>Scheduled recurring income contributing</span>
                    <strong>{dashboard.planning.upcomingIncomeCount}</strong>
                  </li>
                  <li className="metric-breakdown__total">
                    <span>Total projected income</span>
                    <strong>{formatCurrency(projectedIncome)}</strong>
                  </li>
                </ul>
              </div>
            ) : (
              <div id={projectedIncomePanelId} hidden />
            )}

            <div className="support-metrics">
              <article className="support-metric">
                <h2 className="support-metric__label">Bills due this week</h2>
                <p className="support-metric__value">{formatCurrency(billsDueThisWeek)}</p>
              </article>
              <article className="support-metric support-metric--emphasis">
                <h2 className="support-metric__label">
                  Remaining budget
                  <InfoTooltip label="About remaining budget">
                    {CALCULATION_DEFS.remainingBudget.short}
                  </InfoTooltip>
                </h2>
                <p
                  className={`support-metric__value support-metric__value--hero ${
                    remainingBudget !== null && remainingBudget < 0 ? 'is-negative' : ''
                  }`}
                >
                  {remainingBudget === null ? '—' : formatCurrency(remainingBudget)}
                </p>
              </article>
              <article className="support-metric">
                <h2 className="support-metric__label">
                  Safe to spend
                  <InfoTooltip label="About safe to spend">
                    Remaining budget minus bills due this week. Shown only when a monthly budget
                    exists.
                  </InfoTooltip>
                </h2>
                <p className={`support-metric__value ${safeSpend !== null && safeSpend < 0 ? 'is-negative' : ''}`}>
                  {safeSpend === null ? '—' : formatCurrency(safeSpend)}
                </p>
              </article>
            </div>
          </section>

          <section className="action-hub" aria-labelledby="action-hub-heading">
            <h2 id="action-hub-heading">What would you like to do?</h2>
            <div className="action-hub__grid">
              <Link className="action-hub__card" to={paths.transactionsExpensesAdd}>
                Add Expense
              </Link>
              <Link className="action-hub__card" to={paths.transactionsIncomeAdd}>
                Add Income
              </Link>
              <Link className="action-hub__card" to={paths.transactionsRecurringExpenseNew}>
                Add Recurring
              </Link>
              <Link className="action-hub__card" to={paths.budgetsMonthly}>
                View budgets
              </Link>
              <Link className="action-hub__card" to={paths.reportsMonthly}>
                View reports
              </Link>
            </div>
          </section>

          <section className="dashboard-section" aria-labelledby="agenda-heading">
            <div className="section-heading-row">
              <h2 id="agenda-heading">Upcoming</h2>
              <Link to={paths.transactionsRecurringExpenses} className="text-link">
                Manage schedules
              </Link>
            </div>
            {agenda.length === 0 ? (
              <p className="dashboard-empty" role="status">
                Nothing due in the next week.
              </p>
            ) : (
              AGENDA_SECTIONS.map((section) => {
                const rows = agenda.filter((item) => item.group === section.key)
                if (rows.length === 0) return null
                return (
                  <div key={section.key} className="agenda-group">
                    <h3 className="agenda-group__title">{section.title}</h3>
                    <ul className="agenda-list">
                      {rows.map((item) => (
                        <li key={item.id} className="agenda-row">
                          <div className="agenda-row__main">
                            <p className="agenda-row__title">
                              <strong>{item.label}</strong>
                              <span className={`agenda-pill agenda-pill--${item.kind}`}>
                                {item.kind === 'payment' ? 'Bill' : 'Income'}
                              </span>
                            </p>
                            <p className="agenda-row__meta">
                              {formatIsoDate(item.date)} · {item.detail} ·{' '}
                              {formatCurrency(item.amount)}
                            </p>
                          </div>
                          <Button
                            variant="secondary"
                            type="button"
                            disabled={actionBusyId === item.id}
                            onClick={() => void handleAgendaAction(item)}
                          >
                            {actionBusyId === item.id
                              ? 'Working…'
                              : item.kind === 'payment'
                                ? 'Mark Paid'
                                : 'Mark Received'}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })
            )}
          </section>

          <section className="dashboard-section" aria-labelledby="activity-heading">
            <div className="section-heading-row">
              <h2 id="activity-heading">Recent activity</h2>
              <Link to={paths.transactionsAll} className="text-link">
                View all
              </Link>
            </div>
            <ActivityRowList
              items={activityRows}
              emptyMessage="No expenses or income recorded this month yet."
              todayIso={today}
            />
          </section>
        </>
      ) : null}
    </main>
  )
}
