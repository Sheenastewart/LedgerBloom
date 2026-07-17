import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isAbortError } from '../../../api/ApiClientError'
import { HowThisWorks } from '../../../components/HowThisWorks'
import { HelpLink } from '../../guidance/HelpLink'
import { Alert, EmptyState, ErrorPanel, LoadingState, SuccessBanner } from '../../../components/ui/Feedback'
import { paths } from '../../../routes/paths'
import { todayIso } from '../../../utils/dueDateUtils'
import { expandUpcomingSchedules } from '../../../utils/expandRecurringOccurrences'
import { scopeIncludes } from '../../../utils/ledgerPageFilter'
import { formatCurrency } from '../../../utils/moneyUtils'
import { MONTH_OPTIONS } from '../../../utils/periodFilterOptions'
import {
  endOfCalendarMonth,
  groupUpcomingByNextDate,
  upcomingFetchDays,
} from '../../recurring/upcomingPaymentGroups'
import {
  getUpcomingRecurringIncome,
} from '../../recurringIncome/api/recurringIncomeApi'
import { RecurringIncomePanel } from '../../recurringIncome/components/RecurringIncomePanel'
import { UpcomingIncome } from '../../recurringIncome/components/UpcomingIncome'
import type { RecurringIncome } from '../../recurringIncome/types'
import { deleteIncomeEntry, getIncomeEntries, undoReceivedIncomeEntry } from '../api/incomeApi'
import { IncomeFilters, type IncomePageFilters } from '../components/IncomeFilters'
import { IncomeList } from '../components/IncomeList'
import { filterUpcomingIncome } from '../filterUpcomingIncome'
import type { IncomeEntry, IncomeFilters as IncomeFilterValues } from '../types'
import '../income.css'
import '../../categories/categories.css'
import '../../guidance/help.css'
import '../../recurring/recurring.css'
import '../../recurringIncome/recurringIncome.css'

type LocationSuccessState = {
  successMessage?: string
}

const EMPTY_PAGE_FILTERS: IncomePageFilters = { scope: 'all' }

function toRecordedFilters(page: IncomePageFilters): IncomeFilterValues {
  if (!scopeIncludes(page.scope, 'recorded')) {
    return {}
  }
  const next: IncomeFilterValues = {}
  if (page.year !== undefined && page.month !== undefined) {
    next.year = page.year
    next.month = page.month
  }
  if (page.source) {
    next.source = page.source
  }
  return next
}

function toSectionFilters(
  page: IncomePageFilters,
  target: 'upcoming' | 'schedules',
): IncomeFilterValues {
  if (!scopeIncludes(page.scope, target)) {
    return {}
  }
  const next: IncomeFilterValues = {}
  if (page.year !== undefined && page.month !== undefined) {
    next.year = page.year
    next.month = page.month
  }
  if (page.source) {
    next.source = page.source
  }
  return next
}

function fetchDaysForFilters(filters: IncomePageFilters): number {
  return upcomingFetchDays(todayIso(), filters.year, filters.month)
}

export function IncomePage() {
  const location = useLocation()
  const navigate = useNavigate()

  const [entries, setEntries] = useState<IncomeEntry[]>([])
  const [upcoming, setUpcoming] = useState<RecurringIncome[]>([])
  const [appliedFilters, setAppliedFilters] = useState<IncomePageFilters>(EMPTY_PAGE_FILTERS)
  const [loading, setLoading] = useState(true)
  const [upcomingLoading, setUpcomingLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upcomingError, setUpcomingError] = useState<string | null>(null)
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

  const recordedFilters = useMemo(() => toRecordedFilters(appliedFilters), [appliedFilters])
  const expectedFilters = useMemo(
    () => toSectionFilters(appliedFilters, 'upcoming'),
    [appliedFilters],
  )
  const scheduleFilters = useMemo(
    () => toSectionFilters(appliedFilters, 'schedules'),
    [appliedFilters],
  )

  const loadReceived = useCallback(async (filters: IncomeFilterValues, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getIncomeEntries(filters, signal)
      if (signal?.aborted) {
        return
      }
      setEntries(data ?? [])
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

  const loadUpcoming = useCallback(async (days: number, signal?: AbortSignal) => {
    setUpcomingLoading(true)
    setUpcomingError(null)
    try {
      const data = await getUpcomingRecurringIncome(days, signal)
      if (signal?.aborted) {
        return
      }
      setUpcoming(data ?? [])
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) {
        return
      }
      setUpcomingError('Unable to load expected income. Please try again.')
      setUpcoming([])
    } finally {
      if (!signal?.aborted) {
        setUpcomingLoading(false)
      }
    }
  }, [])

  const loadLedger = useCallback(
    async (pageFilters: IncomePageFilters, signal?: AbortSignal) => {
      await Promise.all([
        loadReceived(toRecordedFilters(pageFilters), signal),
        loadUpcoming(fetchDaysForFilters(pageFilters), signal),
      ])
    },
    [loadReceived, loadUpcoming],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadLedger(EMPTY_PAGE_FILTERS, controller.signal)
    return () => controller.abort()
  }, [loadLedger])

  function handleApplyFilters(filters: IncomePageFilters) {
    setAppliedFilters(filters)
    void loadReceived(toRecordedFilters(filters))
    void loadUpcoming(fetchDaysForFilters(filters))
  }

  function handleClearFilters() {
    setAppliedFilters(EMPTY_PAGE_FILTERS)
    void loadReceived({})
    void loadUpcoming(fetchDaysForFilters(EMPTY_PAGE_FILTERS))
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
      await loadLedger(appliedFilters)
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
      await loadReceived(recordedFilters)
      setSuccessMessage(`Deleted income "${entry.description}".`)
    } catch {
      setDeleteError(`Could not delete "${entry.description}". Please try again.`)
    } finally {
      setDeletingIncomeId(null)
    }
  }

  const hasActiveRecordedFilters =
    recordedFilters.year !== undefined ||
    recordedFilters.month !== undefined ||
    recordedFilters.source !== undefined

  const focusPeriod =
    expectedFilters.year !== undefined && expectedFilters.month !== undefined
      ? { year: expectedFilters.year, month: expectedFilters.month }
      : undefined

  const filteredUpcoming = useMemo(() => {
    const today = todayIso()
    const year = expectedFilters.year
    const month = expectedFilters.month
    const periodEnd =
      year !== undefined && month !== undefined
        ? endOfCalendarMonth(year, month)
        : undefined
    const expanded = expandUpcomingSchedules(
      upcoming,
      today,
      (item) => item.nextIncomeDate,
      (item, occurrenceDate) => ({ ...item, nextIncomeDate: occurrenceDate }),
      periodEnd,
    )
    return filterUpcomingIncome(expanded, expectedFilters)
  }, [upcoming, expectedFilters])

  const recurringSuccess =
    successMessage &&
    (successMessage.toLowerCase().includes('recurring') ||
      successMessage.toLowerCase().includes('occurrence') ||
      successMessage.toLowerCase().includes('advanced the next'))
      ? successMessage
      : null

  const incomeTotal = entries.reduce((sum, item) => sum + item.amount, 0)
  const expectedGroups = useMemo(
    () =>
      groupUpcomingByNextDate(filteredUpcoming, todayIso(), (item) => item.nextIncomeDate, {
        thisMonth: "This month's expected",
        nextMonth: "Next month's expected",
      }),
    [filteredUpcoming],
  )
  const thisMonthExpected = expectedGroups.find((group) => group.id === 'thisMonth')
  const expectedCount = focusPeriod
    ? filteredUpcoming.length
    : (thisMonthExpected?.items.length ?? 0)
  const expectedTotal = focusPeriod
    ? filteredUpcoming.reduce((sum, item) => sum + item.amount, 0)
    : (thisMonthExpected?.totalAmount ?? 0)
  const expectedRangeHint = focusPeriod
    ? `Expected pay for ${
        MONTH_OPTIONS.find((option) => option.value === String(focusPeriod.month))?.label ??
        focusPeriod.month
      } ${focusPeriod.year}`
    : "This month's expected pay — next month is a preview only"

  return (
    <main className="content-page">
      <div className="page-header">
        <div>
          <h1>Income</h1>
          <p className="page-subtitle">Record received money and plan upcoming paychecks.</p>
        </div>
        <div className="page-header__actions">
          <Link to={paths.transactionsRecurringIncomeNew} className="button button-secondary">
            Add recurring
          </Link>
          <Link to={paths.transactionsIncomeAdd} className="button button-primary">
            Add income
          </Link>
        </div>
      </div>

      <HowThisWorks>
        <p>
          Received income is money that already arrived. Expected income is planned but not posted
          until you mark it received.
        </p>
        <HelpLink to={`${paths.settingsHelp}?topic=recurring-vs-actual`}>
          Recurring vs. actual entries
        </HelpLink>
      </HowThisWorks>

      {successMessage && !recurringSuccess ? (
        <SuccessBanner>{successMessage}</SuccessBanner>
      ) : null}

      {deleteError ? (
        <Alert tone="error" role="alert">
          {deleteError}
        </Alert>
      ) : null}

      <IncomeFilters
        appliedFilters={appliedFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      <section className="income-activity-section" aria-label="Received and expected income">
        <details className="upcoming-period ledger-fold">
          <summary className="upcoming-period__summary">
            <span className="upcoming-period__title">
              <span className="upcoming-period__label" id="received-income-heading">
                Received income
              </span>
              <span className="upcoming-period__range">Income you've received</span>
            </span>
            <span className="upcoming-period__stats">
              <span className="upcoming-period__count">
                {loading
                  ? '…'
                  : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
              </span>
              {!loading && entries.length > 0 ? (
                <span className="upcoming-period__total">{formatCurrency(incomeTotal)}</span>
              ) : null}
            </span>
          </summary>

          <div className="upcoming-period__body">
            {loading ? <LoadingState withSkeleton>Loading income…</LoadingState> : null}

            {!loading && error ? (
              <ErrorPanel onRetry={() => void loadReceived(recordedFilters)}>
                <p>{error}</p>
              </ErrorPanel>
            ) : null}

            {!loading && !error && entries.length === 0 ? (
              <EmptyState
                title={hasActiveRecordedFilters ? 'No matching income' : 'No received income yet'}
                action={
                  <Link to={paths.transactionsIncomeAdd} className="button button-primary">
                    Add income
                  </Link>
                }
              >
                {hasActiveRecordedFilters
                  ? 'No income entries match the current filters. Try clearing the filter or choosing a different month.'
                  : 'Record paychecks and other money that already arrived.'}
              </EmptyState>
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
          </div>
        </details>

        <details className="upcoming-period ledger-fold">
          <summary className="upcoming-period__summary">
            <span className="upcoming-period__title">
              <span className="upcoming-period__label">Expected income</span>
              <span className="upcoming-period__range">{expectedRangeHint}</span>
            </span>
            <span className="upcoming-period__stats">
              <span className="upcoming-period__count">
                {upcomingLoading
                  ? '…'
                  : `${expectedCount} ${expectedCount === 1 ? 'paycheck' : 'paychecks'}`}
              </span>
              {!upcomingLoading && expectedCount > 0 ? (
                <span className="upcoming-period__total">{formatCurrency(expectedTotal)}</span>
              ) : null}
            </span>
          </summary>

          <div className="upcoming-period__body">
            <HowThisWorks>
              <p>
                These are upcoming schedule dates that have not been marked received yet. Mark
                Received creates a real income entry and moves the schedule forward.
              </p>
              <HelpLink to="/settings/help?topic=recurring-vs-actual">
                Recurring vs. actual entries
              </HelpLink>
            </HowThisWorks>

            {upcomingLoading ? (
              <LoadingState withSkeleton>Loading expected income…</LoadingState>
            ) : null}

            {!upcomingLoading && upcomingError ? (
              <ErrorPanel onRetry={() => void loadUpcoming(fetchDaysForFilters(appliedFilters))}>
                <p>{upcomingError}</p>
              </ErrorPanel>
            ) : null}

            {!upcomingLoading && !upcomingError ? (
              <UpcomingIncome
                items={filteredUpcoming}
                todayIso={todayIso()}
                focusPeriod={focusPeriod}
              />
            ) : null}
          </div>
        </details>
      </section>

      <section className="income-schedules-section" aria-label="All recurring income">
        <RecurringIncomePanel
          successMessage={recurringSuccess}
          onClearSuccessMessage={() => setSuccessMessage(null)}
          onLedgerChanged={() => void loadLedger(appliedFilters)}
          scheduleFilters={scheduleFilters}
        />
      </section>
    </main>
  )
}
