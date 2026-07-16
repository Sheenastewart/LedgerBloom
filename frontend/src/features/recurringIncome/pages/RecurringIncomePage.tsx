import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { HowThisWorks } from '../../../components/HowThisWorks'
import { HelpLink } from '../../guidance/HelpLink'
import {
  deleteRecurringIncome,
  getRecurringIncome,
  getUpcomingRecurringIncome,
  markRecurringIncomeReceived,
} from '../api/recurringIncomeApi'
import { RecurringIncomeFilters } from '../components/RecurringIncomeFilters'
import { RecurringIncomeList } from '../components/RecurringIncomeList'
import { UpcomingIncome } from '../components/UpcomingIncome'
import type { RecurringIncome, RecurringIncomeFilters as RecurringIncomeFilterValues } from '../types'
import '../recurringIncome.css'
import '../../dashboard/dashboard.css'
import '../../guidance/help.css'

type LocationSuccessState = {
  successMessage?: string
}

function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function RecurringIncomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [items, setItems] = useState<RecurringIncome[]>([])
  const [upcoming, setUpcoming] = useState<RecurringIncome[]>([])
  const [appliedFilters, setAppliedFilters] = useState<RecurringIncomeFilterValues>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [markingReceivedId, setMarkingReceivedId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const incomingSuccess = (location.state as LocationSuccessState | null)?.successMessage

  useEffect(() => {
    if (!incomingSuccess) {
      return
    }
    setSuccessMessage(incomingSuccess)
    navigate('.', { replace: true, state: null })
  }, [incomingSuccess, navigate])

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
      setSuccessMessage(`Received "${item.description}" and advanced the next income date.`)
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
    const confirmed = window.confirm(
      `Delete recurring income "${item.description}"? This cannot be undone.`,
    )
    if (!confirmed) {
      return
    }
    setActionError(null)
    setDeletingId(item.id)
    try {
      await deleteRecurringIncome(item.id)
      setSuccessMessage(`Deleted recurring income "${item.description}".`)
      await loadPage(appliedFilters)
    } catch {
      setActionError(`Could not delete "${item.description}". Please try again.`)
    } finally {
      setDeletingId(null)
    }
  }

  const hasActiveFilters =
    appliedFilters.active !== undefined ||
    appliedFilters.cadence !== undefined ||
    appliedFilters.source !== undefined

  return (
    <main className="recurring-income-page page">
      <div className="page-header">
        <div>
          <h1>Recurring Income</h1>
          <p className="page-subtitle">
            Track paychecks and planned income without auto-posting ledger rows.
          </p>
        </div>
        <Link to="/recurring-income/new" className="button button-primary">
          Add Recurring Income
        </Link>
      </div>

      <HowThisWorks>
        <p>
          Recurring schedules plan upcoming paychecks but do not become income on their own. Use
          Mark Received when the income actually arrives to create a real income entry.
        </p>
        <HelpLink to="/help?topic=recurring-vs-actual">Recurring vs. actual entries</HelpLink>
      </HowThisWorks>

      {successMessage ? (
        <p className="status-banner success" role="status" aria-live="polite">
          {successMessage}
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
            <h2 id="recurring-income-list-heading">All recurring income</h2>
            {items.length === 0 ? (
              <div className="status-panel" role="status">
                <p>
                  {hasActiveFilters
                    ? 'No recurring income matches the current filters.'
                    : 'No recurring income yet.'}
                </p>
                <Link to="/recurring-income/new" className="button button-primary">
                  Add Recurring Income
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
              />
            )}
          </section>
        </>
      ) : null}
    </main>
  )
}
