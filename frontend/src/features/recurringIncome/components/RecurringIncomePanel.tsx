import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import {
  catchUpRecurringIncome,
  deleteRecurringIncome,
  getRecurringIncome,
  markRecurringIncomeReceived,
  previewRecurringIncomeOccurrences,
} from '../api/recurringIncomeApi'
import { formatCurrency } from '../../../utils/moneyUtils'
import { displayRecurringAmount } from '../../../utils/monthlyEquivalent'
import type { IncomeFilters } from '../../income/types'
import { RecurringIncomeList } from './RecurringIncomeList'
import type {
  RecurringIncome,
  RecurringIncomeCatchUpResult,
  RecurringIncomeFilters as RecurringIncomeFilterValues,
} from '../types'
import '../recurringIncome.css'
import '../../dashboard/dashboard.css'
import '../../guidance/help.css'

function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function filterSchedulesByPeriod(
  items: RecurringIncome[],
  filters: IncomeFilters,
): RecurringIncome[] {
  const year = filters.year
  const month = filters.month
  if (year === undefined || month === undefined) {
    return items
  }
  return items.filter((item) => {
    const [itemYear, itemMonth] = item.nextIncomeDate.split('-').map(Number)
    return itemYear === year && itemMonth === month
  })
}

type RecurringIncomePanelProps = {
  successMessage?: string | null
  onClearSuccessMessage?: () => void
  onLedgerChanged?: () => void
  /** Source (+ optional month) for the schedules list. */
  scheduleFilters?: IncomeFilters
}

/**
 * All recurring income schedules — filtered from the page-level Filter bar.
 */
export function RecurringIncomePanel({
  successMessage = null,
  onClearSuccessMessage,
  onLedgerChanged,
  scheduleFilters = {},
}: RecurringIncomePanelProps) {
  const [items, setItems] = useState<RecurringIncome[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [localSuccess, setLocalSuccess] = useState<string | null>(null)
  const [markingReceivedId, setMarkingReceivedId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const displaySuccess = localSuccess ?? successMessage

  const apiScheduleFilters: RecurringIncomeFilterValues = useMemo(
    () => (scheduleFilters.source ? { source: scheduleFilters.source } : {}),
    [scheduleFilters.source],
  )

  const loadPage = useCallback(
    async (filters: RecurringIncomeFilterValues, signal?: AbortSignal) => {
      setLoading(true)
      setError(null)
      try {
        const recurringData = await getRecurringIncome(filters, signal)
        if (signal?.aborted) {
          return
        }
        setItems(recurringData)
      } catch (err) {
        if (isAbortError(err) || signal?.aborted) {
          return
        }
        setError('Unable to load recurring income. Please try again.')
        setItems([])
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadPage(apiScheduleFilters, controller.signal)
    return () => controller.abort()
  }, [loadPage, apiScheduleFilters])

  async function handleMarkReceived(item: RecurringIncome) {
    const confirmed = window.confirm(
      `Mark "${item.description}" as received for ${item.nextIncomeDate}? This creates a real income entry and advances the next income date.`,
    )
    if (!confirmed) {
      return
    }
    setActionError(null)
    setMarkingReceivedId(item.id)
    try {
      await markRecurringIncomeReceived(item.id, {
        expectedNextIncomeDate: item.nextIncomeDate,
      })
      setLocalSuccess(`Received "${item.description}" and advanced the next income date.`)
      onClearSuccessMessage?.()
      await loadPage(apiScheduleFilters)
      onLedgerChanged?.()
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'RECURRING_INCOME_RECEIPT_CONFLICT') {
        setActionError(err.message)
        await loadPage(apiScheduleFilters)
        onLedgerChanged?.()
      } else {
        setActionError(`Could not mark "${item.description}" as received. Please try again.`)
      }
    } finally {
      setMarkingReceivedId(null)
    }
  }

  async function handleDelete(item: RecurringIncome) {
    setActionError(null)
    setDeletingId(item.id)
    try {
      await deleteRecurringIncome(item.id)
      setLocalSuccess(`Deleted recurring income "${item.description}".`)
      onClearSuccessMessage?.()
      await loadPage(apiScheduleFilters)
      onLedgerChanged?.()
    } catch {
      setActionError(`Could not delete "${item.description}". Please try again.`)
    } finally {
      setDeletingId(null)
    }
  }

  async function handlePreviewCatchUp(item: RecurringIncome, signal: AbortSignal) {
    return previewRecurringIncomeOccurrences(
      {
        cadence: item.cadence,
        startDate: item.nextIncomeDate,
        amount: item.amount,
        firstPaymentDay: item.firstPaymentDay,
        secondPaymentDay: item.secondPaymentDay,
      },
      signal,
    )
  }

  async function handleSubmitCatchUp(item: RecurringIncome, occurrenceDates: string[]) {
    return catchUpRecurringIncome(item.id, { occurrenceDates })
  }

  function handleCatchUpRecorded(item: RecurringIncome, result: RecurringIncomeCatchUpResult) {
    setActionError(null)
    setLocalSuccess(
      `Recorded ${result.createdCount} past occurrence${result.createdCount === 1 ? '' : 's'} for "${item.description}".`,
    )
    onClearSuccessMessage?.()
    void loadPage(apiScheduleFilters)
    onLedgerChanged?.()
  }

  const hasScheduleFilters =
    Boolean(scheduleFilters.source) ||
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

  return (
    <div className="recurring-income-panel">
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
          Loading recurring income…
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

      <details className="upcoming-period recurring-all-schedules">
        <summary className="upcoming-period__summary">
          <span className="upcoming-period__title">
            <span className="upcoming-period__label" id="recurring-income-list-heading">
              All recurring income
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
                  ? 'No recurring income matches the current filters.'
                  : 'No recurring income schedules yet.'}
              </p>
            </div>
          ) : null}

          {!loading && !error && sortedSchedules.length > 0 ? (
            <RecurringIncomeList
              items={sortedSchedules}
              todayIso={todayIso()}
              markingReceivedId={markingReceivedId}
              deletingId={deletingId}
              onMarkReceived={(item) => void handleMarkReceived(item)}
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
