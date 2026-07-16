import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isAbortError } from '../../../api/ApiClientError'
import { paths } from '../../../routes/paths'
import { expenseDisplayTitle } from '../../../utils/expenseDisplay'
import { scopeIncludes } from '../../../utils/ledgerPageFilter'
import { formatCurrency } from '../../../utils/moneyUtils'
import { getCategories } from '../../categories/api/categoryApi'
import type { Category } from '../../categories/types'
import { deleteExpense, getExpenses } from '../api/expenseApi'
import { ExpenseFilters, type ExpensePageFilters } from '../components/ExpenseFilters'
import { ExpenseList } from '../components/ExpenseList'
import { RecurringExpensesPanel } from '../../recurring/components/RecurringExpensesPanel'
import type { Expense, ExpenseFilters as ExpenseFilterValues } from '../types'
import '../expenses.css'
import '../../categories/categories.css'
import '../../recurring/recurring.css'

type LocationSuccessState = {
  successMessage?: string
}

const EMPTY_PAGE_FILTERS: ExpensePageFilters = { scope: 'all' }

function toRecordedFilters(page: ExpensePageFilters): ExpenseFilterValues {
  if (!scopeIncludes(page.scope, 'recorded')) {
    return {}
  }
  const next: ExpenseFilterValues = {}
  if (page.year !== undefined && page.month !== undefined) {
    next.year = page.year
    next.month = page.month
  }
  if (page.categoryId !== undefined) {
    next.categoryId = page.categoryId
  }
  return next
}

function toSectionFilters(
  page: ExpensePageFilters,
  target: 'upcoming' | 'schedules',
): ExpenseFilterValues {
  if (!scopeIncludes(page.scope, target)) {
    return {}
  }
  const next: ExpenseFilterValues = {}
  if (page.year !== undefined && page.month !== undefined) {
    next.year = page.year
    next.month = page.month
  }
  if (page.categoryId !== undefined) {
    next.categoryId = page.categoryId
  }
  return next
}

export function ExpensesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [appliedFilters, setAppliedFilters] = useState<ExpensePageFilters>(EMPTY_PAGE_FILTERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null)
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

  const recordedFilters = useMemo(() => toRecordedFilters(appliedFilters), [appliedFilters])
  const remainingFilters = useMemo(
    () => toSectionFilters(appliedFilters, 'upcoming'),
    [appliedFilters],
  )
  const scheduleFilters = useMemo(
    () => toSectionFilters(appliedFilters, 'schedules'),
    [appliedFilters],
  )

  const loadExpenses = useCallback(async (filters: ExpenseFilterValues, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getExpenses(filters, signal)
      if (signal?.aborted) {
        return
      }
      setExpenses(data)
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) {
        return
      }
      setError('Unable to load expenses. Please try again.')
      setExpenses([])
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [])

  const loadPage = useCallback(
    async (filters: ExpenseFilterValues, signal?: AbortSignal) => {
      setLoading(true)
      setError(null)

      const [categoriesResult, expensesResult] = await Promise.allSettled([
        getCategories(signal),
        getExpenses(filters, signal),
      ])

      if (signal?.aborted) {
        return
      }

      if (categoriesResult.status === 'fulfilled') {
        setCategories(categoriesResult.value)
      } else if (!isAbortError(categoriesResult.reason)) {
        setCategories([])
      }

      if (expensesResult.status === 'fulfilled') {
        setExpenses(expensesResult.value)
      } else if (!isAbortError(expensesResult.reason)) {
        setError('Unable to load expenses. Please try again.')
        setExpenses([])
      }

      setLoading(false)
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadPage({}, controller.signal)
    return () => controller.abort()
  }, [loadPage])

  function handleApplyFilters(filters: ExpensePageFilters) {
    setAppliedFilters(filters)
    void loadExpenses(toRecordedFilters(filters))
  }

  function handleClearFilters() {
    setAppliedFilters(EMPTY_PAGE_FILTERS)
    void loadExpenses({})
  }

  async function handleDelete(expense: Expense) {
    const title = expenseDisplayTitle({
      merchant: expense.merchant,
      description: expense.description,
      categoryName: expense.category.name,
    })
    setDeleteError(null)
    setDeletingExpenseId(expense.id)
    try {
      await deleteExpense(expense.id)
      await loadExpenses(recordedFilters)
      setSuccessMessage(`Deleted expense "${title}".`)
    } catch {
      setDeleteError(`Could not delete "${title}". Please try again.`)
    } finally {
      setDeletingExpenseId(null)
    }
  }

  const hasActiveRecordedFilters =
    recordedFilters.year !== undefined ||
    recordedFilters.month !== undefined ||
    recordedFilters.categoryId !== undefined

  const expensesTotal = expenses.reduce((sum, item) => sum + item.amount, 0)

  return (
    <main className="content-page">
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p className="page-subtitle">Track spending and planned bills in one place.</p>
        </div>
        <div className="page-header__actions">
          <Link to={paths.transactionsRecurringExpenseNew} className="button button-secondary">
            Add recurring bill
          </Link>
          <Link to={paths.transactionsExpensesAdd} className="button button-primary">
            Add expense
          </Link>
        </div>
      </div>

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

      <ExpenseFilters
        categories={categories}
        appliedFilters={appliedFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      <details className="upcoming-period ledger-fold">
        <summary className="upcoming-period__summary">
          <span className="upcoming-period__title">
            <span className="upcoming-period__label" id="paid-expenses-heading">
              Paid expenses
            </span>
            <span className="upcoming-period__range">Money already spent</span>
          </span>
          <span className="upcoming-period__stats">
            <span className="upcoming-period__count">
              {loading
                ? '…'
                : `${expenses.length} ${expenses.length === 1 ? 'entry' : 'entries'}`}
            </span>
            {!loading && expenses.length > 0 ? (
              <span className="upcoming-period__total">{formatCurrency(expensesTotal)}</span>
            ) : null}
          </span>
        </summary>

        <div className="upcoming-period__body">
          {loading ? (
            <p className="status-banner" role="status" aria-live="polite">
              Loading expenses…
            </p>
          ) : null}

          {!loading && error ? (
            <div className="status-panel" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => void loadPage(recordedFilters)}
              >
                Retry
              </button>
            </div>
          ) : null}

          {!loading && !error && expenses.length === 0 ? (
            <div className="status-panel" role="status">
              <p>
                {hasActiveRecordedFilters
                  ? 'No expenses match the current filters.'
                  : 'No expenses yet.'}
              </p>
              <Link to={paths.transactionsExpensesAdd} className="button button-primary">
                Add expense
              </Link>
            </div>
          ) : null}

          {!loading && !error && expenses.length > 0 ? (
            <ExpenseList
              expenses={expenses}
              deletingExpenseId={deletingExpenseId}
              onDelete={(item) => void handleDelete(item)}
            />
          ) : null}
        </div>
      </details>

      <RecurringExpensesPanel
        successMessage={successMessage?.includes('recurring') ? successMessage : null}
        onClearSuccessMessage={() => setSuccessMessage(null)}
        remainingFilters={remainingFilters}
        scheduleFilters={scheduleFilters}
      />
    </main>
  )
}
