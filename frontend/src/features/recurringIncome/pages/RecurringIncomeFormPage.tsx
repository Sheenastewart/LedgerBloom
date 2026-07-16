import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { formatAmountForInput } from '../../../utils/moneyUtils'
import {
  createRecurringIncome,
  getRecurringIncomeById,
  previewRecurringIncomeOccurrences,
  updateRecurringIncome,
} from '../api/recurringIncomeApi'
import {
  RecurringIncomeForm,
  toRecurringIncomeCreateRequest,
  toRecurringIncomeWriteRequest,
} from '../components/RecurringIncomeForm'
import { parseRecurringIncomeRouteId } from '../parseRecurringIncomeRouteId'
import type { RecurringIncomeFormErrors, RecurringIncomeFormValues } from '../types'
import '../recurringIncome.css'
import '../../categories/categories.css'

type RecurringIncomeFormPageProps = {
  mode: 'create' | 'edit'
}

const emptyValues: RecurringIncomeFormValues = {
  description: '',
  source: '',
  amount: '',
  cadence: '',
  nextIncomeDate: '',
  active: true,
  notes: '',
  firstPaymentDay: '',
  secondPaymentDay: '',
  historyMode: '',
  selectedOccurrenceDates: [],
}

type PrefillState = {
  prefill?: Partial<RecurringIncomeFormValues>
}

function mapServerErrors(error: ApiClientError): RecurringIncomeFormErrors {
  const next: RecurringIncomeFormErrors = {}
  for (const fieldError of error.fieldErrors) {
    if (
      fieldError.field === 'description' ||
      fieldError.field === 'source' ||
      fieldError.field === 'amount' ||
      fieldError.field === 'cadence' ||
      fieldError.field === 'nextIncomeDate' ||
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

export function RecurringIncomeFormPage({ mode }: RecurringIncomeFormPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const routeId = mode === 'edit' ? parseRecurringIncomeRouteId(params.id) : null
  const prefill = (location.state as PrefillState | null)?.prefill

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(mode === 'edit' && routeId === null)
  const [submitting, setSubmitting] = useState(false)
  const [serverErrors, setServerErrors] = useState<RecurringIncomeFormErrors>({})
  const [initialValues, setInitialValues] = useState<RecurringIncomeFormValues>(() =>
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
        if (mode === 'create') {
          setInitialValues(prefill ? { ...emptyValues, ...prefill } : emptyValues)
          setFormKey((value) => value + 1)
          setLoading(false)
          return
        }

        const item = await getRecurringIncomeById(routeId as number, controller.signal)
        if (controller.signal.aborted) {
          return
        }
        setInitialValues({
          description: item.description,
          source: item.source,
          amount: formatAmountForInput(item.amount),
          cadence: item.cadence,
          nextIncomeDate: item.nextIncomeDate,
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
          setLoadError('Unable to load this recurring income. Please try again.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => controller.abort()
  }, [mode, routeId, prefill])

  async function handleSubmit(values: RecurringIncomeFormValues) {
    setSubmitting(true)
    setServerErrors({})
    try {
      if (mode === 'create') {
        const created = await createRecurringIncome(toRecurringIncomeCreateRequest(values))
        navigate('/transactions/recurring-income', {
          state: { successMessage: `Created recurring income "${created.description}".` },
        })
        return
      }
      const updated = await updateRecurringIncome(
        routeId as number,
        toRecurringIncomeWriteRequest(values),
      )
      navigate('/transactions/recurring-income', {
        state: { successMessage: `Updated recurring income "${updated.description}".` },
      })
    } catch (error) {
      if (error instanceof ApiClientError) {
        setServerErrors(mapServerErrors(error))
      } else {
        setServerErrors({ form: 'Unable to save recurring income. Please try again.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="content-page">
      <div className="page-header">
        <div>
          <h1>{mode === 'create' ? 'Add recurring income' : 'Edit recurring income'}</h1>
          <p className="page-subtitle">
            Define a schedule. Income entries are only created when you mark an item received.
          </p>
        </div>
        <Link to="/transactions/recurring-income" className="button button-secondary">
          Back to income
        </Link>
      </div>

      {loading ? (
        <p className="status-banner" role="status" aria-live="polite">
          Loading…
        </p>
      ) : null}

      {!loading && notFound ? (
        <div className="status-panel" role="alert">
          <p>Recurring income not found.</p>
          <Link to="/transactions/recurring-income" className="button button-secondary">
            Back to income
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
        <RecurringIncomeForm
          key={formKey}
          mode={mode}
          initialValues={initialValues}
          serverErrors={serverErrors}
          submitting={submitting}
          previewOccurrences={previewRecurringIncomeOccurrences}
          onSubmit={(values) => void handleSubmit(values)}
          onCancel={() => navigate('/transactions/recurring-income')}
        />
      ) : null}
    </main>
  )
}
