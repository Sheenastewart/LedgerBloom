import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isAbortError } from '../../../api/ApiClientError'
import { paths } from '../../../routes/paths'
import { expenseDisplayTitle } from '../../../utils/expenseDisplay'
import { getCategories } from '../../categories/api/categoryApi'
import type { Category } from '../../categories/types'
import { deleteExpense, getExpenses } from '../api/expenseApi'
import { ExpenseFilters } from '../components/ExpenseFilters'
import { ExpenseList } from '../components/ExpenseList'
import type { Expense, ExpenseFilters as ExpenseFilterValues } from '../types'
import '../expenses.css'
import '../../categories/categories.css'

type LocationSuccessState = {
  successMessage?: string
}

export function ExpensesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [appliedFilters, setAppliedFilters] = useState<ExpenseFilterValues>({})
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

  function handleApplyFilters(filters: ExpenseFilterValues) {
    setAppliedFilters(filters)
    void loadExpenses(filters)
  }

  function handleClearFilters() {
    setAppliedFilters({})
    void loadExpenses({})
  }

  async function handleDelete(expense: Expense) {
    const title = expenseDisplayTitle(expense.description, expense.category.name)
    setDeleteError(null)
    setDeletingExpenseId(expense.id)
    try {
      await deleteExpense(expense.id)
      await loadExpenses(appliedFilters)
      setSuccessMessage(`Deleted expense "${title}".`)
    } catch {
      setDeleteError(`Could not delete "${title}". Please try again.`)
    } finally {
      setDeletingExpenseId(null)
    }
  }

  return (
    <main className="content-page">
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p className="page-subtitle">Track spending by category and month.</p>
        </div>
        <Link to={paths.transactionsExpensesAdd} className="button button-primary">
          Add expense
        </Link>
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
            onClick={() => void loadPage(appliedFilters)}
          >
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error && expenses.length === 0 ? (
        <div className="status-panel" role="status">
          <p>
            {appliedFilters.year !== undefined ||
            appliedFilters.month !== undefined ||
            appliedFilters.categoryId !== undefined
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
    </main>
  )
}
