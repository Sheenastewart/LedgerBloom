import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { formatAmountForInput } from '../../../utils/moneyUtils'
import { getCategories } from '../../categories/api/categoryApi'
import type { Category } from '../../categories/types'
import {
  createRecurringExpense,
  getRecurringExpense,
  previewRecurringExpenseOccurrences,
  updateRecurringExpense,
} from '../api/recurringApi'
import {
  RecurringForm,
  toRecurringCreateRequest,
  toRecurringWriteRequest,
} from '../components/RecurringForm'
import { parseRecurringRouteId } from '../parseRecurringRouteId'
import type { RecurringFormErrors, RecurringFormValues } from '../types'
import '../recurring.css'
import '../../categories/categories.css'

type RecurringFormPageProps = {
  mode: 'create' | 'edit'
}

const emptyValues: RecurringFormValues = {
  description: '',
  merchant: '',
  amount: '',
  categoryId: '',
  cadence: '',
  nextPaymentDate: '',
  active: true,
  notes: '',
  firstPaymentDay: '',
  secondPaymentDay: '',
  historyMode: '',
  selectedOccurrenceDates: [],
}

function mapServerErrors(error: ApiClientError): RecurringFormErrors {
  const next: RecurringFormErrors = {}
  for (const fieldError of error.fieldErrors) {
    if (
      fieldError.field === 'description' ||
      fieldError.field === 'merchant' ||
      fieldError.field === 'amount' ||
      fieldError.field === 'categoryId' ||
      fieldError.field === 'cadence' ||
      fieldError.field === 'nextPaymentDate' ||
      fieldError.field === 'active' ||
      fieldError.field === 'notes' ||
      fieldError.field === 'firstPaymentDay' ||
      fieldError.field === 'secondPaymentDay'
    ) {
      next[fieldError.field] = fieldError.message
    }
  }
  if (Object.keys(next).length === 0) {
    next.form = error.message
  }
  return next
}

export function RecurringFormPage({ mode }: RecurringFormPageProps) {
  const navigate = useNavigate()
  const params = useParams()
  const routeId = mode === 'edit' ? parseRecurringRouteId(params.id) : null

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(mode === 'edit' && routeId === null)
  const [submitting, setSubmitting] = useState(false)
  const [serverErrors, setServerErrors] = useState<RecurringFormErrors>({})
  const [initialValues, setInitialValues] = useState<RecurringFormValues>(emptyValues)
  const [categories, setCategories] = useState<Category[]>([])
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
        const categoryData = await getCategories(controller.signal)
        if (controller.signal.aborted) {
          return
        }
        setCategories(categoryData)

        if (mode === 'create') {
          setInitialValues(emptyValues)
          setLoading(false)
          return
        }

        const item = await getRecurringExpense(routeId as number, controller.signal)
        if (controller.signal.aborted) {
          return
        }
        setInitialValues({
          description: item.description,
          merchant: item.merchant ?? '',
          amount: formatAmountForInput(item.amount),
          categoryId: String(item.category.id),
          cadence: item.cadence,
          nextPaymentDate: item.nextPaymentDate,
          active: item.active,
          notes: item.notes ?? '',
          firstPaymentDay: item.firstPaymentDay != null ? String(item.firstPaymentDay) : '',
          secondPaymentDay: item.secondPaymentDay != null ? String(item.secondPaymentDay) : '',
          historyMode: '',
          selectedOccurrenceDates: [],
        })
        setFormKey((value) => value + 1)
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) {
          return
        }
        if (error instanceof ApiClientError && error.status === 404) {
          setNotFound(true)
        } else {
          setLoadError('Unable to load this recurring expense. Please try again.')
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

  async function handleSubmit(values: RecurringFormValues) {
    setSubmitting(true)
    setServerErrors({})
    try {
      if (mode === 'create') {
        const created = await createRecurringExpense(toRecurringCreateRequest(values))
        navigate('/recurring', {
          state: { successMessage: `Created recurring expense "${created.description}".` },
        })
        return
      }
      const updated = await updateRecurringExpense(
        routeId as number,
        toRecurringWriteRequest(values),
      )
      navigate('/recurring', {
        state: { successMessage: `Updated recurring expense "${updated.description}".` },
      })
    } catch (error) {
      if (error instanceof ApiClientError) {
        setServerErrors(mapServerErrors(error))
      } else {
        setServerErrors({ form: 'Unable to save recurring expense. Please try again.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="content-page">
      <div className="page-header">
        <div>
          <h1>{mode === 'create' ? 'Add recurring expense' : 'Edit recurring expense'}</h1>
          <p className="page-subtitle">Define a schedule. Expenses are only created when you mark an item paid.</p>
        </div>
        <Link to="/recurring" className="button button-secondary">
          Back to recurring
        </Link>
      </div>

      {loading ? (
        <p className="status-banner" role="status" aria-live="polite">
          Loading…
        </p>
      ) : null}

      {!loading && notFound ? (
        <div className="status-panel" role="alert">
          <p>Recurring expense not found.</p>
          <Link to="/recurring" className="button button-secondary">
            Back to recurring
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
        <RecurringForm
          key={formKey}
          mode={mode}
          initialValues={initialValues}
          categories={categories}
          serverErrors={serverErrors}
          submitting={submitting}
          previewOccurrences={previewRecurringExpenseOccurrences}
          onSubmit={(values) => void handleSubmit(values)}
          onCancel={() => navigate('/recurring')}
        />
      ) : null}
    </main>
  )
}
