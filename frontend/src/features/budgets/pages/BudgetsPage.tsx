import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { HowThisWorks } from '../../../components/HowThisWorks'
import { InfoTooltip } from '../../../components/InfoTooltip'
import { ProgressRing } from '../../../components/ui/ProgressRing'
import { formatAmountForInput, formatCurrency } from '../../../utils/moneyUtils'
import { getCategories } from '../../categories/api/categoryApi'
import type { Category } from '../../categories/types'
import { CALCULATION_DEFS } from '../../guidance/calculationDefs'
import { HelpLink } from '../../guidance/HelpLink'
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
import '../budgetPolish.css'
import '../../categories/categories.css'
import '../../dashboard/dashboard.css'
import '../../dashboard/pages/dashboardPolish.css'
import '../../guidance/help.css'

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

export type BudgetsPageView = 'monthly' | 'categories'

type BudgetsPageProps = {
  view?: BudgetsPageView
}

export function BudgetsPage({ view = 'monthly' }: BudgetsPageProps) {
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
          if (
            fieldError.field === 'categoryId' ||
            fieldError.field === 'limitAmount' ||
            fieldError.field === 'assistanceAmount'
          ) {
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
          <h1>{view === 'categories' ? 'Budget categories' : 'Monthly budget'}</h1>
          <p className="page-subtitle">
            {view === 'categories'
              ? 'Optional category ceilings within the selected monthly budget.'
              : 'Plan monthly limits and compare them to actual expenses.'}
          </p>
        </div>
        {view === 'monthly' ? (
          <Link
            to={`/budgets/new${periodToSearch(period)}`}
            className="button button-primary"
          >
            Create budget
          </Link>
        ) : null}
      </div>

      <HowThisWorks>
        <p>
          A monthly budget is a total spending limit for the month. Actual expenses always come
          from saved Expense entries; category limits are optional planning ceilings tracked
          separately from the overall budget.
        </p>
        <HelpLink to="/settings/help?topic=set-monthly-budget">Learn more</HelpLink>
      </HowThisWorks>

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

          {view === 'monthly' ? (
            <>
              <section aria-label="Budget summary">
                <div className="budget-summary-grid">
                  <article className="budget-card budget-card--hero">
                    <h2 className="metric-heading">
                      Remaining
                      <InfoTooltip label="About remaining budget">
                        {CALCULATION_DEFS.remainingBudget.short}
                      </InfoTooltip>
                    </h2>
                    <p className={budget.remaining < 0 ? 'budget-card-value negative' : 'budget-card-value'}>
                      {formatCurrency(budget.remaining)}
                    </p>
                  </article>
                  <article className="budget-card">
                    <h2>Total budget</h2>
                    <p className="budget-card-value">{formatCurrency(budget.totalLimit)}</p>
                  </article>
                  <article className="budget-card">
                    <h2>Actual expenses</h2>
                    <p className="budget-card-value">{formatCurrency(budget.actualExpenses)}</p>
                  </article>
                  {budget.assistanceApplied > 0 ? (
                    <article className="budget-card">
                      <h2>Counts toward budget</h2>
                      <p className="budget-card-value">{formatCurrency(budget.budgetableExpenses)}</p>
                      <p className="field-hint">
                        {formatCurrency(budget.assistanceApplied)} covered by food assistance.
                      </p>
                    </article>
                  ) : null}
                  <article className="budget-card">
                    <h2 className="metric-heading">
                      Percent used
                      <InfoTooltip label="About percent used">
                        {CALCULATION_DEFS.percentUsed.short}
                      </InfoTooltip>
                    </h2>
                    <p className="budget-card-value">{budget.percentUsed.toFixed(2)}%</p>
                  </article>
                  <article className="budget-card">
                    <h2 className="metric-heading">
                      Status
                      <InfoTooltip label="About budget status">
                        {CALCULATION_DEFS.budgetStatus.short}
                      </InfoTooltip>
                    </h2>
                    <p className={`budget-status ${overallStatus ?? ''}`}>
                      {overallStatus ? budgetStatusLabel(overallStatus) : '—'}
                    </p>
                    <HelpLink to="/settings/help?topic=budget-status-labels">What do these mean?</HelpLink>
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
                <Link to={`/budgets/categories${periodToSearch(period)}`} className="button button-primary">
                  Manage category limits
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="budget-actions-row">
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
            <h2 id="category-limits-heading" className="metric-heading">
              Category limits
              <InfoTooltip label="About category budget limits">
                {CALCULATION_DEFS.categoryBudgetLimit.short}
              </InfoTooltip>
            </h2>
            {budget.categoryLimits.length === 0 ? (
              <p className="dashboard-empty" role="status">
                No category limits for this month.
              </p>
            ) : (
              <ul className="budget-limit-list" aria-label="Category budget limits">
                {budget.categoryLimits.map((limit) => {
                  const status = budgetStatus(limit.overBudget, limit.percentUsed)
                  const tone =
                    status === 'over-budget'
                      ? 'danger'
                      : status === 'near-budget'
                        ? 'warning'
                        : 'success'
                  return (
                    <li key={limit.id} className="budget-limit-row">
                      <ProgressRing
                        percent={limit.percentUsed}
                        tone={tone}
                        label={`${limit.category.name} ${limit.percentUsed.toFixed(0)} percent used`}
                      />
                      <div>
                        <p className="budget-limit-row__hero">
                          <span className="budget-limit-row__hero-label">
                            {limit.category.name} · Remaining
                          </span>
                          <span
                            className={`budget-limit-row__hero-value ${
                              limit.remaining < 0 ? 'is-negative' : ''
                            }`}
                          >
                            {formatCurrency(limit.remaining)}
                          </span>
                        </p>
                        <p className="budget-limit-row__meta">
                          <span>Spent {formatCurrency(limit.actualSpent)}</span>
                          <span>Toward limit {formatCurrency(limit.budgetableSpent)}</span>
                          <span>Budget {formatCurrency(limit.limitAmount)}</span>
                          {limit.assistanceAmount > 0 ? (
                            <span>Assistance {formatCurrency(limit.assistanceAmount)}</span>
                          ) : null}
                          <span className={`budget-status ${status}`}>{budgetStatusLabel(status)}</span>
                        </p>
                      </div>
                      <div className="budget-limit-row__actions">
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
                    </li>
                  )
                })}
              </ul>
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
                      ? { categoryId: '', limitAmount: '', assistanceAmount: '' }
                      : {
                          categoryId: String(limitEditor.limit.category.id),
                          limitAmount: formatAmountForInput(limitEditor.limit.limitAmount),
                          assistanceAmount:
                            limitEditor.limit.assistanceAmount > 0
                              ? formatAmountForInput(limitEditor.limit.assistanceAmount)
                              : '',
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
          )}
        </>
      ) : null}
    </main>
  )
}
