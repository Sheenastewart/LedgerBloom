import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { HowThisWorks } from '../../../components/HowThisWorks'
import { HelpLink } from '../../guidance/HelpLink'
import { todayIso } from '../../../utils/dueDateUtils'
import { expandUpcomingSchedules } from '../../../utils/expandRecurringOccurrences'
import { expenseDisplayTitle } from '../../../utils/expenseDisplay'
import { formatCurrency } from '../../../utils/moneyUtils'
import { displayRecurringAmount } from '../../../utils/monthlyEquivalent'
import { paths } from '../../../routes/paths'
import type { ExpenseFilters } from '../../expenses/types'
import { filterUpcomingExpenses } from '../../expenses/filterUpcomingExpenses'
import {
  catchUpRecurringExpense,
  deleteRecurringExpense,
  getRecurringExpenses,
  getUpcomingRecurringExpenses,
  markRecurringExpensePaid,
  previewRecurringExpenseOccurrences,
} from '../api/recurringApi'
import { RecurringList } from './RecurringList'
import { UpcomingPayments } from './UpcomingPayments'
import type {
  RecurringExpense,
  RecurringExpenseCatchUpResult,
  RecurringFilters as RecurringFilterValues,
} from '../types'
import { upcomingFetchDays, groupUpcomingPayments } from '../upcomingPaymentGroups'
import '../recurring.css'
import '../../dashboard/dashboard.css'
import '../../guidance/help.css'

function filterSchedulesByPeriod(
  items: RecurringExpense[],
  filters: ExpenseFilters,
): RecurringExpense[] {
  const year = filters.year
  const month = filters.month
  if (year === undefined || month === undefined) {
    return items
  }
  return items.filter((item) => {
    const [itemYear, itemMonth] = item.nextPaymentDate.split('-').map(Number)
    return itemYear === year && itemMonth === month
  })
}

type RecurringExpensesPanelProps = {
  successMessage?: string | null
  onClearSuccessMessage?: () => void
  /** Category (+ optional month) for the schedules list. */
  scheduleFilters?: ExpenseFilters
  /** Month / year / category for remaining bills. */
  remainingFilters?: ExpenseFilters
}

/** Recurring bills panel embedded on the Expenses page. */
export function RecurringExpensesPanel({
  successMessage = null,
  onClearSuccessMessage,
  scheduleFilters = {},
  remainingFilters = {},
}: RecurringExpensesPanelProps) {
  const [items, setItems] = useState<RecurringExpense[]>([])
  const [upcoming, setUpcoming] = useState<RecurringExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [localSuccess, setLocalSuccess] = useState<string | null>(null)
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const displaySuccess = localSuccess ?? successMessage

  const apiScheduleFilters: RecurringFilterValues = useMemo(
    () =>
      scheduleFilters.categoryId !== undefined
        ? { categoryId: scheduleFilters.categoryId }
        : {},
    [scheduleFilters.categoryId],
  )

  const loadPage = useCallback(async (filters: RecurringFilterValues, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const [recurringData, upcomingData] = await Promise.all([
        getRecurringExpenses(filters, signal),
        getUpcomingRecurringExpenses(upcomingFetchDays(todayIso()), signal),
      ])
      if (signal?.aborted) {
        return
      }
      setItems(recurringData)
      setUpcoming(upcomingData)
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) {
        return
      }
      setError('Unable to load recurring expenses. Please try again.')
      setItems([])
      setUpcoming([])
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadPage(apiScheduleFilters, controller.signal)
    return () => controller.abort()
  }, [loadPage, apiScheduleFilters])

  async function handleMarkPaid(item: RecurringExpense) {
    const title = expenseDisplayTitle({
      merchant: item.merchant,
      description: item.description,
      categoryName: item.category.name,
    })
    const confirmed = window.confirm(
      `Mark "${title}" as paid for ${item.nextPaymentDate}? This creates a real expense and advances the next payment date.`,
    )
    if (!confirmed) {
      return
    }
    setActionError(null)
    setMarkingPaidId(item.id)
    try {
      await markRecurringExpensePaid(item.id, {
        expectedNextPaymentDate: item.nextPaymentDate,
      })
      setLocalSuccess(`Paid "${title}" and advanced the next payment date.`)
      onClearSuccessMessage?.()
      await loadPage(apiScheduleFilters)
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'RECURRING_EXPENSE_PAYMENT_CONFLICT') {
        setActionError(err.message)
        await loadPage(apiScheduleFilters)
      } else {
        setActionError(`Could not mark "${title}" as paid. Please try again.`)
      }
    } finally {
      setMarkingPaidId(null)
    }
  }

  async function handleDelete(item: RecurringExpense) {
    const title = expenseDisplayTitle({
      merchant: item.merchant,
      description: item.description,
      categoryName: item.category.name,
    })
    setActionError(null)
    setDeletingId(item.id)
    try {
      await deleteRecurringExpense(item.id)
      setLocalSuccess(`Deleted recurring expense "${title}".`)
      onClearSuccessMessage?.()
      await loadPage(apiScheduleFilters)
    } catch {
      setActionError(`Could not delete "${title}". Please try again.`)
    } finally {
      setDeletingId(null)
    }
  }

  async function handlePreviewCatchUp(item: RecurringExpense, signal: AbortSignal) {
    return previewRecurringExpenseOccurrences(
      {
        cadence: item.cadence,
        startDate: item.nextPaymentDate,
        amount: item.amount,
        firstPaymentDay: item.firstPaymentDay,
        secondPaymentDay: item.secondPaymentDay,
      },
      signal,
    )
  }

  async function handleSubmitCatchUp(item: RecurringExpense, occurrenceDates: string[]) {
    return catchUpRecurringExpense(item.id, { occurrenceDates })
  }

  function handleCatchUpRecorded(item: RecurringExpense, result: RecurringExpenseCatchUpResult) {
    const title = expenseDisplayTitle({
      merchant: item.merchant,
      description: item.description,
      categoryName: item.category.name,
    })
    setActionError(null)
    setLocalSuccess(
      `Recorded ${result.createdCount} past occurrence${result.createdCount === 1 ? '' : 's'} for "${title}".`,
    )
    onClearSuccessMessage?.()
    void loadPage(apiScheduleFilters)
  }

  const filteredUpcoming = useMemo(() => {
    const filtered = filterUpcomingExpenses(upcoming, remainingFilters)
    return expandUpcomingSchedules(
      filtered,
      todayIso(),
      (item) => item.nextPaymentDate,
      (item, occurrenceDate) => ({ ...item, nextPaymentDate: occurrenceDate }),
    )
  }, [upcoming, remainingFilters])

  const hasScheduleFilters =
    scheduleFilters.categoryId !== undefined ||
    scheduleFilters.year !== undefined ||
    scheduleFilters.month !== undefined

  const sortedSchedules = useMemo(() => {
    const filtered = filterSchedulesByPeriod(items, scheduleFilters)
    return [...filtered].sort((a, b) => {
      if (a.active !== b.active) {
        return a.active ? -1 : 1
      }
      const amountDiff =
        displayRecurringAmount(b.amount, b.cadence) - displayRecurringAmount(a.amount, a.cadence)
      if (amountDiff !== 0) {
        return amountDiff
      }
      return a.id - b.id
    })
  }, [items, scheduleFilters])

  const schedulesTotal = sortedSchedules.reduce(
    (sum, item) => sum + displayRecurringAmount(item.amount, item.cadence),
    0,
  )
  const remainingGroups = groupUpcomingPayments(filteredUpcoming, todayIso())
  const thisMonthRemaining = remainingGroups.find((group) => group.id === 'thisMonth')
  const remainingCount = thisMonthRemaining?.items.length ?? 0
  const remainingTotal = thisMonthRemaining?.totalAmount ?? 0

  return (
    <div className="recurring-expenses-panel">
      {displaySuccess ? (
        <p className="status-banner success" role="status" aria-live="polite">
          {displaySuccess}
        </p>
      ) : null}

      {actionError ? (
        <p className="status-banner error" role="alert">
          {actionError}
        </p>
      ) : null}

      {loading ? (
        <p className="status-banner" role="status" aria-live="polite">
          Loading recurring expenses…
        </p>
      ) : null}

      {!loading && error ? (
        <div className="status-panel" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => void loadPage(apiScheduleFilters)}
          >
            Retry
          </button>
        </div>
      ) : null}

      <details className="upcoming-period recurring-hub">
        <summary className="upcoming-period__summary">
          <span className="upcoming-period__title">
            <span className="upcoming-period__label">Remaining expenses</span>
            <span className="upcoming-period__range">
              This month&apos;s bills still due — next month is a preview only
            </span>
          </span>
          <span className="upcoming-period__stats">
            <span className="upcoming-period__count">
              {remainingCount} {remainingCount === 1 ? 'payment' : 'payments'}
            </span>
            {remainingCount > 0 ? (
              <span className="upcoming-period__total">{formatCurrency(remainingTotal)}</span>
            ) : null}
          </span>
        </summary>

        <div className="upcoming-period__body">
          <HowThisWorks>
            <p>
              These are upcoming schedule dates that have not been marked paid yet. Mark Paid creates
              a real expense entry and moves the schedule forward.
            </p>
            <HelpLink to="/settings/help?topic=recurring-vs-actual">Recurring vs. actual entries</HelpLink>
          </HowThisWorks>

          {!loading && !error ? (
            <UpcomingPayments items={filteredUpcoming} todayIso={todayIso()} />
          ) : null}
        </div>
      </details>

      <details className="upcoming-period recurring-all-schedules">
        <summary className="upcoming-period__summary">
          <span className="upcoming-period__title">
            <span className="upcoming-period__label" id="recurring-list-heading">
              All recurring expenses
            </span>
            <span className="upcoming-period__range">
              Highest to lowest — weekly and twice-a-month scaled to a month
            </span>
          </span>
          <span className="upcoming-period__stats">
            <span className="upcoming-period__count">
              {sortedSchedules.length} {sortedSchedules.length === 1 ? 'schedule' : 'schedules'}
            </span>
            {sortedSchedules.length > 0 ? (
              <span className="upcoming-period__total">{formatCurrency(schedulesTotal)}</span>
            ) : null}
          </span>
        </summary>

        <div className="upcoming-period__body">
          {!loading && !error && sortedSchedules.length === 0 ? (
            <div className="status-panel" role="status">
              <p>
                {hasScheduleFilters
                  ? 'No recurring expenses match the current filters.'
                  : 'No recurring expenses yet.'}
              </p>
              <Link to={paths.transactionsRecurringExpenseNew} className="button button-primary">
                Add Recurring Expense
              </Link>
            </div>
          ) : null}

          {!loading && !error && sortedSchedules.length > 0 ? (
            <RecurringList
              items={sortedSchedules}
              todayIso={todayIso()}
              markingPaidId={markingPaidId}
              deletingId={deletingId}
              onMarkPaid={(item) => void handleMarkPaid(item)}
              onDelete={(item) => void handleDelete(item)}
              onPreviewCatchUp={handlePreviewCatchUp}
              onSubmitCatchUp={handleSubmitCatchUp}
              onCatchUpRecorded={handleCatchUpRecorded}
            />
          ) : null}
        </div>
      </details>
    </div>
  )
}
