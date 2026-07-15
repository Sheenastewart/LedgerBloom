import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { getCategories } from '../../categories/api/categoryApi'
import type { Category } from '../../categories/types'
import { createExpense, getExpense, updateExpense } from '../api/expenseApi'
import { formatAmountForInput } from '../amountUtils'
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

export function ExpenseFormPage({ mode }: ExpenseFormPageProps) {
  const navigate = useNavigate()
  const params = useParams()
  const routeId = mode === 'edit' ? parseExpenseRouteId(params.id) : null

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(mode === 'edit' && routeId === null)
  const [submitting, setSubmitting] = useState(false)
  const [serverErrors, setServerErrors] = useState<ExpenseFormErrors>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [initialValues, setInitialValues] = useState<ExpenseFormValues>(emptyValues)
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
            description: expenseData.description,
            merchant: expenseData.merchant ?? '',
            amount: formatAmountForInput(expenseData.amount),
            expenseDate: expenseData.expenseDate,
            categoryId: String(expenseData.category.id),
            notes: expenseData.notes ?? '',
          })
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
      if (mode === 'create') {
        await createExpense(body)
        navigate('/expenses', {
          state: { successMessage: `Created expense "${body.description}".` },
        })
        return
      }

      if (routeId === null) {
        setNotFound(true)
        return
      }

      await updateExpense(routeId, body)
      navigate('/expenses', {
        state: { successMessage: `Updated expense "${body.description}".` },
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
            onClick={() => navigate('/expenses')}
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
            onClick={() => navigate('/expenses')}
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
        onCancel={() => navigate('/expenses')}
      />
    </main>
  )
}
