import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { formatAmountForInput } from '../../../utils/moneyUtils'
import {
  createMonthlyBudget,
  getMonthlyBudget,
  updateMonthlyBudget,
} from '../api/budgetApi'
import {
  MonthlyBudgetForm,
  toMonthlyBudgetUpdateRequest,
  toMonthlyBudgetWriteRequest,
} from '../components/MonthlyBudgetForm'
import { parseBudgetRouteId } from '../parseBudgetRouteId'
import type { BudgetPeriod, MonthlyBudgetFormErrors, MonthlyBudgetFormValues } from '../types'
import '../budgets.css'
import '../../categories/categories.css'

type BudgetFormPageProps = {
  mode: 'create' | 'edit'
}

function currentPeriod(): BudgetPeriod {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

function parsePeriodFromSearch(params: URLSearchParams): BudgetPeriod | null {
  const yearRaw = params.get('year')
  const monthRaw = params.get('month')
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

function mapServerErrors(error: ApiClientError): MonthlyBudgetFormErrors {
  const next: MonthlyBudgetFormErrors = {}

  for (const fieldError of error.fieldErrors) {
    if (
      fieldError.field === 'year' ||
      fieldError.field === 'month' ||
      fieldError.field === 'totalLimit'
    ) {
      next[fieldError.field] = fieldError.message
    }
  }

  if (error.code === 'BUDGET_ALREADY_EXISTS') {
    next.form = error.message
  } else if (error.code === 'INVALID_BUDGET_DATA') {
    if (!next.totalLimit && !next.year && !next.month) {
      next.form = error.message
    }
  } else if (!next.year && !next.month && !next.totalLimit) {
    next.form = error.message
  }

  return next
}

export function BudgetFormPage({ mode }: BudgetFormPageProps) {
  const navigate = useNavigate()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const routeId = mode === 'edit' ? parseBudgetRouteId(params.id) : null
  const queryPeriod = parsePeriodFromSearch(searchParams) ?? currentPeriod()

  const emptyValues: MonthlyBudgetFormValues = {
    year: String(queryPeriod.year),
    month: String(queryPeriod.month),
    totalLimit: '',
  }

  const [loading, setLoading] = useState(mode === 'edit')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(mode === 'edit' && routeId === null)
  const [submitting, setSubmitting] = useState(false)
  const [serverErrors, setServerErrors] = useState<MonthlyBudgetFormErrors>({})
  const [initialValues, setInitialValues] = useState<MonthlyBudgetFormValues>(emptyValues)
  const [formKey, setFormKey] = useState(0)
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>(queryPeriod)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setLoadError(null)

      if (mode === 'edit' && routeId === null) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setNotFound(false)

      if (mode === 'create') {
        setInitialValues(emptyValues)
        setBudgetPeriod(queryPeriod)
        setLoading(false)
        return
      }

      try {
        // Edit mode: load by querying year/month from the list flow via query params first.
        // Fall back to requiring year/month in the URL.
        const entry = await getMonthlyBudget(queryPeriod, controller.signal)
        if (controller.signal.aborted) {
          return
        }
        if (entry.id !== routeId) {
          setNotFound(true)
          return
        }
        setBudgetPeriod({ year: entry.year, month: entry.month })
        setInitialValues({
          year: String(entry.year),
          month: String(entry.month),
          totalLimit: formatAmountForInput(entry.totalLimit),
        })
        setFormKey((value) => value + 1)
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) {
          return
        }
        if (error instanceof ApiClientError && error.status === 404) {
          setNotFound(true)
        } else {
          setLoadError('Unable to load this budget. Please try again.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, routeId])

  async function handleSubmit(values: MonthlyBudgetFormValues) {
    setSubmitting(true)
    setServerErrors({})
    try {
      if (mode === 'create') {
        const created = await createMonthlyBudget(toMonthlyBudgetWriteRequest(values))
        navigate(`/budgets?year=${created.year}&month=${created.month}`, {
          state: { successMessage: `Created budget for ${created.month}/${created.year}.` },
        })
        return
      }
      const updated = await updateMonthlyBudget(
        routeId as number,
        toMonthlyBudgetUpdateRequest(values),
      )
      navigate(`/budgets?year=${updated.year}&month=${updated.month}`, {
        state: { successMessage: 'Budget updated.' },
      })
    } catch (error) {
      if (error instanceof ApiClientError) {
        setServerErrors(mapServerErrors(error))
      } else {
        setServerErrors({ form: 'Unable to save budget. Please try again.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const cancelPath = `/budgets?year=${budgetPeriod.year}&month=${budgetPeriod.month}`

  return (
    <main className="content-page">
      <div className="page-header">
        <div>
          <h1>{mode === 'create' ? 'Create budget' : 'Edit budget'}</h1>
          <p className="page-subtitle">
            {mode === 'create'
              ? 'Set an overall monthly spending limit.'
              : 'Update the overall monthly spending limit.'}
          </p>
        </div>
        <Link to={cancelPath} className="button button-secondary">
          Back to budgets
        </Link>
      </div>

      {loading ? (
        <p className="status-banner" role="status" aria-live="polite">
          Loading budget…
        </p>
      ) : null}

      {!loading && notFound ? (
        <div className="status-panel" role="alert">
          <p>Budget not found.</p>
          <Link to="/budgets" className="button button-secondary">
            Back to budgets
          </Link>
        </div>
      ) : null}

      {!loading && loadError ? (
        <div className="status-panel" role="alert">
          <p>{loadError}</p>
          <button type="button" className="button button-secondary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !notFound && !loadError ? (
        <MonthlyBudgetForm
          key={formKey}
          mode={mode}
          initialValues={initialValues}
          serverErrors={serverErrors}
          submitting={submitting}
          onSubmit={(values) => void handleSubmit(values)}
          onCancel={() => navigate(cancelPath)}
        />
      ) : null}
    </main>
  )
}
