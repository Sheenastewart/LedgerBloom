import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { isAbortError } from '../../../api/ApiClientError'
import { HowThisWorks } from '../../../components/HowThisWorks'
import { HelpLink } from '../../guidance/HelpLink'
import { RecurringIncomePanel } from '../../recurringIncome/components/RecurringIncomePanel'
import { deleteIncomeEntry, getIncomeEntries } from '../api/incomeApi'
import { IncomeFilters } from '../components/IncomeFilters'
import { IncomeList } from '../components/IncomeList'
import type { IncomeEntry, IncomeFilters as IncomeFilterValues } from '../types'
import '../income.css'
import '../../categories/categories.css'
import '../../guidance/help.css'

type LocationSuccessState = {
  successMessage?: string
}

type IncomeSection = 'received' | 'recurring'

function parseSection(value: string | null): IncomeSection {
  return value === 'recurring' ? 'recurring' : 'received'
}

export function IncomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const section = useMemo(() => parseSection(searchParams.get('section')), [searchParams])

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
    if (section !== 'received') {
      return
    }
    const controller = new AbortController()
    void loadPage({}, controller.signal)
    return () => controller.abort()
  }, [loadPage, section])

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

  function setSection(next: IncomeSection) {
    const nextParams = new URLSearchParams(searchParams)
    if (next === 'received') {
      nextParams.delete('section')
    } else {
      nextParams.set('section', next)
    }
    setSearchParams(nextParams, { replace: true })
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
          <p className="page-subtitle">
            Record money you received and plan pay on a repeating schedule.
          </p>
        </div>
        <Link to="/income/add" className="button button-primary">
          Add income
        </Link>
      </div>

      <HowThisWorks>
        <p>
          Received income is money that already arrived. Recurring schedules project upcoming pay
          without creating ledger rows until you mark them received.
        </p>
        <HelpLink to="/help?topic=recurring-vs-actual">Recurring vs. actual entries</HelpLink>
      </HowThisWorks>

      <div className="income-section-tabs" role="tablist" aria-label="Income sections">
        <button
          type="button"
          role="tab"
          id="income-tab-received"
          aria-selected={section === 'received'}
          aria-controls="income-panel-received"
          className={section === 'received' ? 'income-tab active' : 'income-tab'}
          onClick={() => setSection('received')}
        >
          Received
        </button>
        <button
          type="button"
          role="tab"
          id="income-tab-recurring"
          aria-selected={section === 'recurring'}
          aria-controls="income-panel-recurring"
          className={section === 'recurring' ? 'income-tab active' : 'income-tab'}
          onClick={() => setSection('recurring')}
        >
          Recurring schedules
        </button>
      </div>

      {section === 'received' && successMessage ? (
        <p className="status-banner success" role="status" aria-live="polite">
          {successMessage}
        </p>
      ) : null}

      {deleteError ? (
        <p className="status-banner error" role="alert">
          {deleteError}
        </p>
      ) : null}

      {section === 'received' ? (
        <div
          id="income-panel-received"
          role="tabpanel"
          aria-labelledby="income-tab-received"
        >
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
        </div>
      ) : (
        <div
          id="income-panel-recurring"
          role="tabpanel"
          aria-labelledby="income-tab-recurring"
        >
          <RecurringIncomePanel
            successMessage={successMessage}
            onClearSuccessMessage={() => setSuccessMessage(null)}
          />
        </div>
      )}
    </main>
  )
}
