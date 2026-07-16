import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { isAbortError } from '../../../api/ApiClientError'
import { HowThisWorks } from '../../../components/HowThisWorks'
import { HelpLink } from '../../guidance/HelpLink'
import { paths } from '../../../routes/paths'
import { deleteIncomeEntry, getIncomeEntries, undoReceivedIncomeEntry } from '../api/incomeApi'
import { IncomeFilters } from '../components/IncomeFilters'
import { IncomeList } from '../components/IncomeList'
import type { IncomeEntry, IncomeFilters as IncomeFilterValues } from '../types'
import '../income.css'
import '../../categories/categories.css'
import '../../guidance/help.css'

type LocationSuccessState = {
  successMessage?: string
}

export function IncomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  if (searchParams.get('section') === 'recurring') {
    return <Navigate to={paths.transactionsRecurringIncome} replace state={location.state} />
  }

  const [entries, setEntries] = useState<IncomeEntry[]>([])
  const [appliedFilters, setAppliedFilters] = useState<IncomeFilterValues>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingIncomeId, setDeletingIncomeId] = useState<number | null>(null)
  const [undoingIncomeId, setUndoingIncomeId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const incomingSuccess = (location.state as LocationSuccessState | null)?.successMessage

  useEffect(() => {
    if (!incomingSuccess) {
      return
    }
    setSuccessMessage(incomingSuccess)
    navigate({ pathname: '.', search: location.search }, { replace: true, state: null })
  }, [incomingSuccess, navigate, location.search])

  const loadPage = useCallback(async (filters: IncomeFilterValues, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getIncomeEntries(filters, signal)
      if (signal?.aborted) {
        return
      }
      setEntries(data)
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) {
        return
      }
      setError('Unable to load income entries. Please try again.')
      setEntries([])
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

  function handleApplyFilters(filters: IncomeFilterValues) {
    setAppliedFilters(filters)
    void loadPage(filters)
  }

  function handleClearFilters() {
    setAppliedFilters({})
    void loadPage({})
  }

  async function handleUndoReceived(entry: IncomeEntry) {
    const confirmed = window.confirm(
      `Undo receiving "${entry.description}" on ${entry.incomeDate}? This removes the income entry and restores the recurring schedule when possible.`,
    )
    if (!confirmed) {
      return
    }

    setDeleteError(null)
    setUndoingIncomeId(entry.id)
    try {
      await undoReceivedIncomeEntry(entry.id)
      await loadPage(appliedFilters)
      setSuccessMessage(`Undid receiving "${entry.description}".`)
    } catch {
      setDeleteError(`Could not undo "${entry.description}". Please try again.`)
    } finally {
      setUndoingIncomeId(null)
    }
  }

  async function handleDelete(entry: IncomeEntry) {
    setDeleteError(null)
    setDeletingIncomeId(entry.id)
    try {
      await deleteIncomeEntry(entry.id)
      await loadPage(appliedFilters)
      setSuccessMessage(`Deleted income "${entry.description}".`)
    } catch {
      setDeleteError(`Could not delete "${entry.description}". Please try again.`)
    } finally {
      setDeletingIncomeId(null)
    }
  }

  const hasActiveFilters =
    appliedFilters.year !== undefined ||
    appliedFilters.month !== undefined ||
    appliedFilters.source !== undefined

  return (
    <main className="content-page">
      <div className="page-header">
        <div>
          <h1>Income</h1>
          <p className="page-subtitle">Record money you have already received.</p>
        </div>
        <Link to={paths.transactionsIncomeAdd} className="button button-primary">
          Add income
        </Link>
      </div>

      <HowThisWorks>
        <p>
          Received income is money that already arrived. Recurring schedules live under the
          Recurring Income tab and do not create ledger rows until you mark them received.
        </p>
        <HelpLink to={`${paths.settingsHelp}?topic=recurring-vs-actual`}>
          Recurring vs. actual entries
        </HelpLink>
      </HowThisWorks>

      {successMessage ? (
        <p className="status-banner success" role="status" aria-live="polite">
          {successMessage}
        </p>
      ) : null}

      {deleteError ? (
        <p className="status-banner error" role="alert">
          {deleteError}
        </p>
      ) : null}

      <IncomeFilters
        appliedFilters={appliedFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      {loading ? (
        <p className="status-banner" role="status" aria-live="polite">
          Loading income…
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

      {!loading && !error && entries.length === 0 ? (
        <div className="status-panel" role="status">
          <p>
            {hasActiveFilters
              ? 'No income entries match the current filters.'
              : 'No received income yet.'}
          </p>
          <Link to={paths.transactionsIncomeAdd} className="button button-primary">
            Add income
          </Link>
        </div>
      ) : null}

      {!loading && !error && entries.length > 0 ? (
        <IncomeList
          entries={entries}
          deletingIncomeId={deletingIncomeId}
          undoingIncomeId={undoingIncomeId}
          onDelete={(item) => void handleDelete(item)}
          onUndoReceived={(item) => void handleUndoReceived(item)}
        />
      ) : null}
    </main>
  )
}
