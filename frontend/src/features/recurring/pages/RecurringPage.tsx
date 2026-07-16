import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { HowThisWorks } from '../../../components/HowThisWorks'
import { getCategories } from '../../categories/api/categoryApi'
import type { Category } from '../../categories/types'
import { HelpLink } from '../../guidance/HelpLink'
import {
  catchUpRecurringExpense,
  deleteRecurringExpense,
  getRecurringExpenses,
  getUpcomingRecurringExpenses,
  markRecurringExpensePaid,
  previewRecurringExpenseOccurrences,
} from '../api/recurringApi'
import { RecurringFilters } from '../components/RecurringFilters'
import { RecurringList } from '../components/RecurringList'
import { UpcomingPayments } from '../components/UpcomingPayments'
import type {
  RecurringExpense,
  RecurringExpenseCatchUpResult,
  RecurringFilters as RecurringFilterValues,
} from '../types'
import '../recurring.css'
import '../../categories/categories.css'
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

export function RecurringPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [items, setItems] = useState<RecurringExpense[]>([])
  const [upcoming, setUpcoming] = useState<RecurringExpense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [appliedFilters, setAppliedFilters] = useState<RecurringFilterValues>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null)
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

  const loadPage = useCallback(async (filters: RecurringFilterValues, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const [categoryData, recurringData, upcomingData] = await Promise.all([
        getCategories(signal),
        getRecurringExpenses(filters, signal),
        getUpcomingRecurringExpenses(30, signal),
      ])
      if (signal?.aborted) {
        return
      }
      setCategories(categoryData)
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
    void loadPage({}, controller.signal)
    return () => controller.abort()
  }, [loadPage])

  async function handleMarkPaid(item: RecurringExpense) {
    const confirmed = window.confirm(
      `Mark "${item.description}" as paid for ${item.nextPaymentDate}? This creates a real expense and advances the next payment date.`,
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
      setSuccessMessage(`Paid "${item.description}" and advanced the next payment date.`)
      await loadPage(appliedFilters)
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'RECURRING_EXPENSE_PAYMENT_CONFLICT') {
        setActionError(err.message)
        await loadPage(appliedFilters)
      } else {
        setActionError(`Could not mark "${item.description}" as paid. Please try again.`)
      }
    } finally {
      setMarkingPaidId(null)
    }
  }

  async function handleDelete(item: RecurringExpense) {
    const confirmed = window.confirm(
      `Delete recurring expense "${item.description}"? This cannot be undone.`,
    )
    if (!confirmed) {
      return
    }
    setActionError(null)
    setDeletingId(item.id)
    try {
      await deleteRecurringExpense(item.id)
      setSuccessMessage(`Deleted recurring expense "${item.description}".`)
      await loadPage(appliedFilters)
    } catch {
      setActionError(`Could not delete "${item.description}". Please try again.`)
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
    setActionError(null)
    setSuccessMessage(
      `Recorded ${result.createdCount} past occurrence${result.createdCount === 1 ? '' : 's'} for "${item.description}".`,
    )
    void loadPage(appliedFilters)
  }

  const hasActiveFilters =
    appliedFilters.active !== undefined ||
    appliedFilters.categoryId !== undefined ||
    appliedFilters.cadence !== undefined

  return (
    <main className="recurring-page page">
      <div className="page-header">
        <div>
          <h1>Recurring</h1>
          <p className="page-subtitle">Track subscriptions and planned expenses without auto-posting ledger rows.</p>
        </div>
        <Link to="/transactions/recurring-expenses/new" className="button button-primary">
          Add Recurring Expense
        </Link>
      </div>

      <HowThisWorks>
        <p>
          Recurring schedules plan upcoming bills but do not become expenses on their own. Use
          Mark Paid when a payment is actually made to create a real expense entry.
        </p>
        <HelpLink to="/settings/help?topic=recurring-vs-actual">Recurring vs. actual entries</HelpLink>
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

      <RecurringFilters
        categories={categories}
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
          Loading recurring expenses…
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
          <UpcomingPayments items={upcoming} todayIso={todayIso()} />

          <section className="recurring-section" aria-labelledby="recurring-list-heading">
            <h2 id="recurring-list-heading">All recurring expenses</h2>
            {items.length === 0 ? (
              <div className="status-panel" role="status">
                <p>
                  {hasActiveFilters
                    ? 'No recurring expenses match the current filters.'
                    : 'No recurring expenses yet.'}
                </p>
                <Link to="/transactions/recurring-expenses/new" className="button button-primary">
                  Add Recurring Expense
                </Link>
              </div>
            ) : (
              <RecurringList
                items={items}
                todayIso={todayIso()}
                markingPaidId={markingPaidId}
                deletingId={deletingId}
                onMarkPaid={(item) => void handleMarkPaid(item)}
                onDelete={(item) => void handleDelete(item)}
                onPreviewCatchUp={handlePreviewCatchUp}
                onSubmitCatchUp={handleSubmitCatchUp}
                onCatchUpRecorded={handleCatchUpRecorded}
              />
            )}
          </section>
        </>
      ) : null}
    </main>
  )
}
