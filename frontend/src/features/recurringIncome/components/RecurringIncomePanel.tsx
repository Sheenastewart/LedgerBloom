import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { HowThisWorks } from '../../../components/HowThisWorks'
import { HelpLink } from '../../guidance/HelpLink'
import {
  catchUpRecurringIncome,
  deleteRecurringIncome,
  getRecurringIncome,
  getUpcomingRecurringIncome,
  markRecurringIncomeReceived,
  previewRecurringIncomeOccurrences,
} from '../api/recurringIncomeApi'
import { RecurringIncomeFilters } from './RecurringIncomeFilters'
import { RecurringIncomeList } from './RecurringIncomeList'
import { UpcomingIncome } from './UpcomingIncome'
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

type RecurringIncomePanelProps = {
  successMessage?: string | null
  onClearSuccessMessage?: () => void
}

/**
 * Recurring schedules panel embedded in the Income area.
 * Does not create IncomeEntry rows except via Mark Received.
 */
export function RecurringIncomePanel({
  successMessage = null,
  onClearSuccessMessage,
}: RecurringIncomePanelProps) {
  const [items, setItems] = useState<RecurringIncome[]>([])
  const [upcoming, setUpcoming] = useState<RecurringIncome[]>([])
  const [appliedFilters, setAppliedFilters] = useState<RecurringIncomeFilterValues>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [localSuccess, setLocalSuccess] = useState<string | null>(null)
  const [markingReceivedId, setMarkingReceivedId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const displaySuccess = localSuccess ?? successMessage

  const loadPage = useCallback(async (filters: RecurringIncomeFilterValues, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const [recurringData, upcomingData] = await Promise.all([
        getRecurringIncome(filters, signal),
        getUpcomingRecurringIncome(30, signal),
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
      setError('Unable to load recurring income. Please try again.')
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
    void loadPage({}, controller.signal)
    return () => controller.abort()
  }, [loadPage])

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
      await loadPage(appliedFilters)
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'RECURRING_INCOME_RECEIPT_CONFLICT') {
        setActionError(err.message)
        await loadPage(appliedFilters)
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
      await loadPage(appliedFilters)
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
    void loadPage(appliedFilters)
  }

  const hasActiveFilters =
    appliedFilters.active !== undefined ||
    appliedFilters.cadence !== undefined ||
    appliedFilters.source !== undefined

  return (
    <div className="recurring-income-panel">
      <HowThisWorks>
        <p>
          Recurring schedules plan upcoming paychecks but do not become income on their own. Use
          Mark Received when the income actually arrives to create a real income entry.
        </p>
        <HelpLink to="/settings/help?topic=recurring-vs-actual">Recurring vs. actual entries</HelpLink>
      </HowThisWorks>

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

      <RecurringIncomeFilters
        appliedFilters={appliedFilters}
        onApply={(filters) => {
          setAppliedFilters(filters)
          void loadPage(filters)
        }}
        onClear={() => {
          setAppliedFilters({})
          void loadPage({})
        }}
      />

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
            onClick={() => void loadPage(appliedFilters)}
          >
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <UpcomingIncome items={upcoming} todayIso={todayIso()} />

          <section className="recurring-section" aria-labelledby="recurring-income-list-heading">
            <div className="section-header-row">
              <h2 id="recurring-income-list-heading">Recurring schedules</h2>
              <Link to="/transactions/recurring-income/new" className="button button-secondary">
                Add recurring
              </Link>
            </div>
            {items.length === 0 ? (
              <div className="status-panel" role="status">
                <p>
                  {hasActiveFilters
                    ? 'No recurring income matches the current filters.'
                    : 'No recurring income schedules yet.'}
                </p>
                <Link to="/transactions/recurring-income/new" className="button button-primary">
                  Add recurring
                </Link>
              </div>
            ) : (
              <RecurringIncomeList
                items={items}
                todayIso={todayIso()}
                markingReceivedId={markingReceivedId}
                deletingId={deletingId}
                onMarkReceived={(item) => void handleMarkReceived(item)}
                onDelete={(item) => void handleDelete(item)}
                onPreviewCatchUp={handlePreviewCatchUp}
                onSubmitCatchUp={handleSubmitCatchUp}
                onCatchUpRecorded={handleCatchUpRecorded}
              />
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
