import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { expenseDisplayTitle } from '../../../utils/expenseDisplay'
import { getCategories } from '../../categories/api/categoryApi'
import type { Category } from '../../categories/types'
import { createExpense, getExpense, updateExpense } from '../api/expenseApi'
import { formatAmountForInput } from '../amountUtils'
import { userFacingNotes } from '../../../utils/notesUtils'
import { ExpenseForm, toExpenseWriteRequest } from '../components/ExpenseForm'
import { parseExpenseRouteId } from '../parseExpenseRouteId'
import type { ExpenseFormErrors, ExpenseFormValues } from '../types'
import '../expenses.css'
import '../../categories/categories.css'

type ExpenseFormPageProps = {
  mode: 'create' | 'edit'
}

function mapServerErrors(error: ApiClientError): ExpenseFormErrors {
  const next: ExpenseFormErrors = {}

  for (const fieldError of error.fieldErrors) {
    if (
      fieldError.field === 'description' ||
      fieldError.field === 'merchant' ||
      fieldError.field === 'amount' ||
      fieldError.field === 'expenseDate' ||
      fieldError.field === 'categoryId' ||
      fieldError.field === 'notes'
    ) {
      next[fieldError.field] = fieldError.message
    }
  }

  if (error.code === 'CATEGORY_NOT_FOUND') {
    next.categoryId = error.message
  } else if (error.code === 'INVALID_EXPENSE_DATA') {
    if (
      !next.description &&
      !next.merchant &&
      !next.amount &&
      !next.expenseDate &&
      !next.categoryId
    ) {
      next.form = error.message
    }
  } else if (
    !next.description &&
    !next.merchant &&
    !next.amount &&
    !next.expenseDate &&
    !next.categoryId &&
    !next.notes
  ) {
    next.form = error.message
  }

  return next
}

const emptyValues: ExpenseFormValues = {
  description: '',
  merchant: '',
  amount: '',
  expenseDate: '',
  categoryId: '',
  notes: '',
}

type PrefillState = {
  prefill?: Partial<ExpenseFormValues>
}

export function ExpenseFormPage({ mode }: ExpenseFormPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const routeId = mode === 'edit' ? parseExpenseRouteId(params.id) : null
  const prefill = (location.state as PrefillState | null)?.prefill

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(mode === 'edit' && routeId === null)
  const [submitting, setSubmitting] = useState(false)
  const [serverErrors, setServerErrors] = useState<ExpenseFormErrors>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [initialValues, setInitialValues] = useState<ExpenseFormValues>(() =>
    mode === 'create' && prefill ? { ...emptyValues, ...prefill } : emptyValues,
  )
  const [formKey, setFormKey] = useState(0)

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

      try {
        const categoryPromise = getCategories(controller.signal)
        const expensePromise =
          mode === 'edit' && routeId !== null
            ? getExpense(routeId, controller.signal)
            : Promise.resolve(null)

        const [categoryData, expenseData] = await Promise.all([categoryPromise, expensePromise])

        if (controller.signal.aborted) {
          return
        }

        setCategories(categoryData)

        if (expenseData) {
          setInitialValues({
            description: expenseData.description ?? '',
            merchant: expenseData.merchant ?? '',
            amount: formatAmountForInput(expenseData.amount),
            expenseDate: expenseData.expenseDate,
            categoryId: String(expenseData.category.id),
            notes: userFacingNotes(expenseData.notes) ?? '',
          })
          setFormKey((value) => value + 1)
        } else if (mode === 'create' && prefill) {
          setInitialValues({ ...emptyValues, ...prefill })
          setFormKey((value) => value + 1)
        }
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) {
          return
        }
        if (error instanceof ApiClientError && error.status === 404) {
          setNotFound(true)
        } else {
          setLoadError('Unable to load this expense. Please try again.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => controller.abort()
  }, [mode, routeId])

  async function handleSubmit(values: ExpenseFormValues) {
    setSubmitting(true)
    setServerErrors({})
    try {
      const body = toExpenseWriteRequest(values)
      const categoryName =
        categories.find((category) => category.id === body.categoryId)?.name ?? 'expense'
      const title = expenseDisplayTitle({
        merchant: body.merchant,
        description: body.description,
        categoryName,
      })
      if (mode === 'create') {
        await createExpense(body)
        navigate('/transactions/expenses', {
          state: { successMessage: `Created expense "${title}".` },
        })
        return
      }

      if (routeId === null) {
        setNotFound(true)
        return
      }

      await updateExpense(routeId, body)
      navigate('/transactions/expenses', {
        state: { successMessage: `Updated expense "${title}".` },
      })
    } catch (error) {
      if (error instanceof ApiClientError) {
        setServerErrors(mapServerErrors(error))
      } else {
        setServerErrors({ form: 'Unable to save the expense. Please try again.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="content-page">
        <p className="status-banner" role="status" aria-live="polite">
          {mode === 'create' ? 'Loading categories…' : 'Loading expense…'}
        </p>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="content-page">
        <div className="status-panel" role="alert">
          <h1>Expense not found</h1>
          <p>That expense does not exist or the link is invalid.</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => navigate('/transactions/expenses')}
          >
            Back to expenses
          </button>
        </div>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="content-page">
        <div className="status-panel" role="alert">
          <p>{loadError}</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => navigate('/transactions/expenses')}
          >
            Back to expenses
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="content-page">
      <ExpenseForm
        key={formKey}
        mode={mode}
        initialValues={initialValues}
        categories={categories}
        submitting={submitting}
        serverErrors={serverErrors}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/transactions/expenses')}
      />
    </main>
  )
}
