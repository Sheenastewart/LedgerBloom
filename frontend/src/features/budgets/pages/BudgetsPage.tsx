import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { formatAmountForInput, formatCurrency } from '../../../utils/moneyUtils'
import { getCategories } from '../../categories/api/categoryApi'
import type { Category } from '../../categories/types'
import {
  createCategoryLimit,
  deleteCategoryLimit,
  deleteMonthlyBudget,
  getMonthlyBudget,
  updateCategoryLimit,
} from '../api/budgetApi'
import { budgetStatus, budgetStatusLabel } from '../budgetStatus'
import { BudgetPeriodForm } from '../components/BudgetPeriodForm'
import {
  CategoryLimitForm,
  toCategoryLimitCreateRequest,
  toCategoryLimitUpdateRequest,
} from '../components/CategoryLimitForm'
import type {
  BudgetPeriod,
  CategoryLimitFormErrors,
  CategoryLimitFormValues,
  CategoryBudgetLimit,
  MonthlyBudget,
} from '../types'
import '../budgets.css'
import '../../categories/categories.css'
import '../../dashboard/dashboard.css'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

function currentPeriod(): BudgetPeriod {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

function periodLabel(period: BudgetPeriod): string {
  return `${MONTH_NAMES[period.month - 1]} ${period.year}`
}

function parsePeriodFromSearch(params: URLSearchParams): BudgetPeriod | null {
  const yearRaw = params.get('year')
  const monthRaw = params.get('month')
  if (yearRaw === null && monthRaw === null) {
    return null
  }
  if (yearRaw === null || monthRaw === null) {
    return null
  }
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    return null
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }
  return { year, month }
}

function periodToSearch(period: BudgetPeriod): string {
  return `?year=${period.year}&month=${period.month}`
}

type LimitEditor =
  | { mode: 'create' }
  | { mode: 'edit'; limit: CategoryBudgetLimit }
  | null

type LocationSuccessState = {
  successMessage?: string
}

export function BudgetsPage() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialPeriod = parsePeriodFromSearch(searchParams) ?? currentPeriod()

  const [period, setPeriod] = useState<BudgetPeriod>(initialPeriod)
  const [budget, setBudget] = useState<MonthlyBudget | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [limitEditor, setLimitEditor] = useState<LimitEditor>(null)
  const [limitSubmitting, setLimitSubmitting] = useState(false)
  const [limitServerErrors, setLimitServerErrors] = useState<CategoryLimitFormErrors>({})
  const [deletingLimitId, setDeletingLimitId] = useState<number | null>(null)
  const [deletingBudget, setDeletingBudget] = useState(false)

  const incomingSuccess = (location.state as LocationSuccessState | null)?.successMessage

  useEffect(() => {
    if (!incomingSuccess) {
      return
    }
    setSuccessMessage(incomingSuccess)
    window.history.replaceState({}, document.title)
  }, [incomingSuccess])

  const syncPeriodToUrl = useCallback(
    (next: BudgetPeriod) => {
      setSearchParams({ year: String(next.year), month: String(next.month) }, { replace: true })
    },
    [setSearchParams],
  )

  useEffect(() => {
    const fromUrl = parsePeriodFromSearch(searchParams)
    if (fromUrl && (fromUrl.year !== period.year || fromUrl.month !== period.month)) {
      setPeriod(fromUrl)
    } else if (!fromUrl) {
      syncPeriodToUrl(period)
    }
    // Only re-sync when search params change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const loadBudget = useCallback(async (nextPeriod: BudgetPeriod, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      const data = await getMonthlyBudget(nextPeriod, signal)
      if (signal?.aborted) {
        return
      }
      setBudget(data)
      setNotFound(false)
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) {
        return
      }
      if (err instanceof ApiClientError && err.code === 'BUDGET_NOT_FOUND') {
        setBudget(null)
        setNotFound(true)
      } else if (err instanceof ApiClientError && err.code === 'INVALID_REQUEST') {
        setError(err.message)
        setBudget(null)
      } else {
        setError('Unable to load the monthly budget. Please try again.')
        setBudget(null)
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadBudget(period, controller.signal)
    return () => controller.abort()
  }, [loadBudget, period])

  useEffect(() => {
    const controller = new AbortController()
    void getCategories(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setCategories(data)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCategories([])
        }
      })
    return () => controller.abort()
  }, [])

  function handleApplyPeriod(nextPeriod: BudgetPeriod) {
    setSuccessMessage(null)
    setLimitEditor(null)
    if (nextPeriod.year === period.year && nextPeriod.month === period.month) {
      void loadBudget(nextPeriod)
      return
    }
    setPeriod(nextPeriod)
    syncPeriodToUrl(nextPeriod)
  }

  async function handleDeleteBudget() {
    if (!budget) {
      return
    }
    const confirmed = window.confirm(
      `Delete the budget for ${periodLabel({ year: budget.year, month: budget.month })}? Category limits will also be removed.`,
    )
    if (!confirmed) {
      return
    }
    setDeletingBudget(true)
    setError(null)
    try {
      await deleteMonthlyBudget(budget.id)
      setSuccessMessage(`Deleted budget for ${periodLabel(period)}.`)
      setLimitEditor(null)
      await loadBudget(period)
    } catch {
      setError('Could not delete this budget. Please try again.')
    } finally {
      setDeletingBudget(false)
    }
  }

  async function handleDeleteLimit(limit: CategoryBudgetLimit) {
    if (!budget) {
      return
    }
    const confirmed = window.confirm(
      `Delete the category limit for "${limit.category.name}"? This cannot be undone.`,
    )
    if (!confirmed) {
      return
    }
    setDeletingLimitId(limit.id)
    setError(null)
    try {
      const updated = await deleteCategoryLimit(budget.id, limit.id)
      setBudget(updated)
      setSuccessMessage(`Deleted category limit for "${limit.category.name}".`)
      if (limitEditor?.mode === 'edit' && limitEditor.limit.id === limit.id) {
        setLimitEditor(null)
      }
    } catch {
      setError(`Could not delete the limit for "${limit.category.name}". Please try again.`)
    } finally {
      setDeletingLimitId(null)
    }
  }

  async function handleLimitSubmit(values: CategoryLimitFormValues) {
    if (!budget || !limitEditor) {
      return
    }
    setLimitSubmitting(true)
    setLimitServerErrors({})
    try {
      let updated: MonthlyBudget
      if (limitEditor.mode === 'create') {
        updated = await createCategoryLimit(budget.id, toCategoryLimitCreateRequest(values))
        setSuccessMessage('Category limit added.')
      } else {
        updated = await updateCategoryLimit(
          budget.id,
          limitEditor.limit.id,
          toCategoryLimitUpdateRequest(values),
        )
        setSuccessMessage(`Updated category limit for "${limitEditor.limit.category.name}".`)
      }
      setBudget(updated)
      setLimitEditor(null)
    } catch (err) {
      if (err instanceof ApiClientError) {
        const next: CategoryLimitFormErrors = {}
        for (const fieldError of err.fieldErrors) {
          if (fieldError.field === 'categoryId' || fieldError.field === 'limitAmount') {
            next[fieldError.field] = fieldError.message
          }
        }
        if (err.code === 'CATEGORY_BUDGET_ALREADY_EXISTS') {
          next.form = err.message
        } else if (Object.keys(next).length === 0) {
          next.form = err.message
        }
        setLimitServerErrors(next)
      } else {
        setLimitServerErrors({ form: 'Unable to save category limit. Please try again.' })
      }
    } finally {
      setLimitSubmitting(false)
    }
  }

  const availableCategories = useMemo(() => {
    if (!budget) {
      return categories
    }
    const used = new Set(budget.categoryLimits.map((limit) => limit.category.id))
    if (limitEditor?.mode === 'edit') {
      return categories
    }
    return categories.filter((category) => !used.has(category.id))
  }, [budget, categories, limitEditor])

  const overallStatus = budget ? budgetStatus(budget.overBudget, budget.percentUsed) : null

  return (
    <main className="budgets-page page">
      <div className="page-header">
        <div>
          <h1>Budgets</h1>
          <p className="page-subtitle">Plan monthly limits and compare them to actual expenses.</p>
        </div>
        <Link
          to={`/budgets/new${periodToSearch(period)}`}
          className="button button-primary"
        >
          Create budget
        </Link>
      </div>

      <BudgetPeriodForm appliedPeriod={period} onApply={handleApplyPeriod} />

      {successMessage ? (
        <p className="status-banner success" role="status" aria-live="polite">
          {successMessage}
        </p>
      ) : null}

      {error ? (
        <div className="status-panel" role="alert">
          <p>{error}</p>
          <button type="button" className="button button-secondary" onClick={() => void loadBudget(period)}>
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="status-banner" role="status" aria-live="polite">
          Loading budget…
        </p>
      ) : null}

      {!loading && !error && notFound ? (
        <div className="status-panel" role="status">
          <p>No budget set for {periodLabel(period)}.</p>
          <Link to={`/budgets/new${periodToSearch(period)}`} className="button button-primary">
            Create budget
          </Link>
        </div>
      ) : null}

      {!loading && !error && budget ? (
        <>
          <p className="status-banner" role="status" aria-live="polite">
            Showing {periodLabel({ year: budget.year, month: budget.month })}.
          </p>

          <section aria-label="Budget summary">
            <div className="budget-summary-grid">
              <article className="budget-card">
                <h2>Total budget</h2>
                <p className="budget-card-value">{formatCurrency(budget.totalLimit)}</p>
              </article>
              <article className="budget-card">
                <h2>Actual expenses</h2>
                <p className="budget-card-value">{formatCurrency(budget.actualExpenses)}</p>
              </article>
              <article className="budget-card">
                <h2>Remaining</h2>
                <p className={budget.remaining < 0 ? 'budget-card-value negative' : 'budget-card-value'}>
                  {formatCurrency(budget.remaining)}
                </p>
              </article>
              <article className="budget-card">
                <h2>Percent used</h2>
                <p className="budget-card-value">{budget.percentUsed.toFixed(2)}%</p>
              </article>
              <article className="budget-card">
                <h2>Status</h2>
                <p className={`budget-status ${overallStatus ?? ''}`}>
                  {overallStatus ? budgetStatusLabel(overallStatus) : '—'}
                </p>
              </article>
              <article className="budget-card">
                <h2>Expense entries</h2>
                <p className="budget-card-value">{budget.expenseCount}</p>
              </article>
            </div>
          </section>

          <div className="budget-actions-row">
            <Link to={`/budgets/${budget.id}/edit${periodToSearch(period)}`} className="button button-secondary">
              Edit budget
            </Link>
            <button
              type="button"
              className="button button-secondary"
              disabled={deletingBudget}
              onClick={() => void handleDeleteBudget()}
            >
              {deletingBudget ? 'Deleting…' : 'Delete budget'}
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                setLimitServerErrors({})
                setLimitEditor({ mode: 'create' })
              }}
            >
              Add category limit
            </button>
          </div>

          <section className="budget-section" aria-labelledby="category-limits-heading">
            <h2 id="category-limits-heading">Category limits</h2>
            {budget.categoryLimits.length === 0 ? (
              <p className="dashboard-empty" role="status">
                No category limits for this month.
              </p>
            ) : (
              <div className="budget-table-wrap">
                <table className="budget-table">
                  <thead>
                    <tr>
                      <th scope="col">Category</th>
                      <th scope="col" className="numeric">
                        Limit
                      </th>
                      <th scope="col" className="numeric">
                        Spent
                      </th>
                      <th scope="col" className="numeric">
                        Remaining
                      </th>
                      <th scope="col" className="numeric">
                        Used
                      </th>
                      <th scope="col">Status</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budget.categoryLimits.map((limit) => {
                      const status = budgetStatus(limit.overBudget, limit.percentUsed)
                      return (
                        <tr key={limit.id}>
                          <th scope="row">{limit.category.name}</th>
                          <td className="numeric">{formatCurrency(limit.limitAmount)}</td>
                          <td className="numeric">{formatCurrency(limit.actualSpent)}</td>
                          <td className="numeric">{formatCurrency(limit.remaining)}</td>
                          <td className="numeric">{limit.percentUsed.toFixed(2)}%</td>
                          <td>
                            <span className={`budget-status ${status}`}>{budgetStatusLabel(status)}</span>
                          </td>
                          <td>
                            <div className="budget-actions-row">
                              <button
                                type="button"
                                className="button button-secondary"
                                onClick={() => {
                                  setLimitServerErrors({})
                                  setLimitEditor({ mode: 'edit', limit })
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="button button-secondary"
                                disabled={deletingLimitId === limit.id}
                                onClick={() => void handleDeleteLimit(limit)}
                              >
                                {deletingLimitId === limit.id ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {limitEditor ? (
            <div className="budget-inline-form">
              <h3>
                {limitEditor.mode === 'create'
                  ? 'Add category limit'
                  : `Edit limit for ${limitEditor.limit.category.name}`}
              </h3>
              {limitEditor.mode === 'create' && availableCategories.length === 0 ? (
                <p role="status">All categories already have limits for this month.</p>
              ) : (
                <CategoryLimitForm
                  key={limitEditor.mode === 'create' ? 'create' : `edit-${limitEditor.limit.id}`}
                  mode={limitEditor.mode}
                  categories={availableCategories}
                  initialValues={
                    limitEditor.mode === 'create'
                      ? { categoryId: '', limitAmount: '' }
                      : {
                          categoryId: String(limitEditor.limit.category.id),
                          limitAmount: formatAmountForInput(limitEditor.limit.limitAmount),
                        }
                  }
                  serverErrors={limitServerErrors}
                  submitting={limitSubmitting}
                  onSubmit={(values) => void handleLimitSubmit(values)}
                  onCancel={() => setLimitEditor(null)}
                />
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  )
}
