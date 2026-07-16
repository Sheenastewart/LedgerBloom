import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isAbortError } from '../../../api/ApiClientError'
import { deleteIncomeEntry, getIncomeEntries } from '../api/incomeApi'
import { IncomeFilters } from '../components/IncomeFilters'
import { IncomeList } from '../components/IncomeList'
import type { IncomeEntry, IncomeFilters as IncomeFilterValues } from '../types'
import '../income.css'
import '../../categories/categories.css'

type LocationSuccessState = {
  successMessage?: string
}

export function IncomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<IncomeEntry[]>([])
  const [appliedFilters, setAppliedFilters] = useState<IncomeFilterValues>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingIncomeId, setDeletingIncomeId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const incomingSuccess = (location.state as LocationSuccessState | null)?.successMessage

  useEffect(() => {
    if (!incomingSuccess) {
      return
    }
    setSuccessMessage(incomingSuccess)
    navigate('.', { replace: true, state: null })
  }, [incomingSuccess, navigate])

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

  async function handleDelete(entry: IncomeEntry) {
    const confirmed = window.confirm(
      `Delete income entry "${entry.description}"? This cannot be undone.`,
    )
    if (!confirmed) {
      return
    }

    setDeleteError(null)
    setDeletingIncomeId(entry.id)
    try {
      await deleteIncomeEntry(entry.id)
      await loadPage(appliedFilters)
      setSuccessMessage(`Deleted income entry "${entry.description}".`)
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
          <p className="page-subtitle">Track income by source and month.</p>
        </div>
        <Link to="/income/add" className="button button-primary">
          Add income
        </Link>
      </div>

      <section className="income-entry-options" aria-label="Ways to add income">
        <Link
          to="/income/new"
          className="income-entry-option"
          aria-label="Add One-Time Income"
        >
          <h2>Add One-Time Income</h2>
          <p>
            Record money you received once, such as a refund, bonus, or one-time
            payment.
          </p>
        </Link>
        <Link
          to="/recurring-income/new"
          className="income-entry-option"
          aria-label="Add Recurring Income"
        >
          <h2>Add Recurring Income</h2>
          <p>
            Set up income received on a repeating schedule, such as weekly,
            biweekly, or monthly pay.
          </p>
        </Link>
      </section>

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
              : 'No income entries yet.'}
          </p>
          <Link to="/income/add" className="button button-primary">
            Add income
          </Link>
        </div>
      ) : null}

      {!loading && !error && entries.length > 0 ? (
        <IncomeList
          entries={entries}
          deletingIncomeId={deletingIncomeId}
          onDelete={(item) => void handleDelete(item)}
        />
      ) : null}
    </main>
  )
}
