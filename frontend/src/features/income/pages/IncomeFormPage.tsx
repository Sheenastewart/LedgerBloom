import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import { formatAmountForInput } from '../../../utils/moneyUtils'
import { userFacingNotes } from '../../../utils/notesUtils'
import { createIncomeEntry, getIncomeEntry, updateIncomeEntry } from '../api/incomeApi'
import { IncomeForm, toIncomeWriteRequest } from '../components/IncomeForm'
import { parseIncomeRouteId } from '../parseIncomeRouteId'
import type { IncomeFormErrors, IncomeFormValues } from '../types'
import '../income.css'
import '../../categories/categories.css'

type IncomeFormPageProps = {
  mode: 'create' | 'edit'
}

function mapServerErrors(error: ApiClientError): IncomeFormErrors {
  const next: IncomeFormErrors = {}

  for (const fieldError of error.fieldErrors) {
    if (
      fieldError.field === 'description' ||
      fieldError.field === 'source' ||
      fieldError.field === 'amount' ||
      fieldError.field === 'incomeDate' ||
      fieldError.field === 'notes'
    ) {
      next[fieldError.field] = fieldError.message
    }
  }

  if (error.code === 'INVALID_INCOME_DATA') {
    if (!next.description && !next.source && !next.amount && !next.incomeDate) {
      next.form = error.message
    }
  } else if (!next.description && !next.source && !next.amount && !next.incomeDate && !next.notes) {
    next.form = error.message
  }

  return next
}

const emptyValues: IncomeFormValues = {
  description: '',
  source: '',
  amount: '',
  incomeDate: '',
  notes: '',
}

type PrefillState = {
  prefill?: Partial<IncomeFormValues>
}

export function IncomeFormPage({ mode }: IncomeFormPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const routeId = mode === 'edit' ? parseIncomeRouteId(params.id) : null
  const prefill = (location.state as PrefillState | null)?.prefill

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(mode === 'edit' && routeId === null)
  const [submitting, setSubmitting] = useState(false)
  const [serverErrors, setServerErrors] = useState<IncomeFormErrors>({})
  const [initialValues, setInitialValues] = useState<IncomeFormValues>(() =>
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

      if (mode === 'create') {
        if (prefill) {
          setInitialValues({ ...emptyValues, ...prefill })
          setFormKey((value) => value + 1)
        }
        setLoading(false)
        return
      }

      try {
        const entry = await getIncomeEntry(routeId as number, controller.signal)

        if (controller.signal.aborted) {
          return
        }

        setInitialValues({
          description: entry.description,
          source: entry.source,
          amount: formatAmountForInput(entry.amount),
          incomeDate: entry.incomeDate,
          notes: userFacingNotes(entry.notes) ?? '',
        })
        setFormKey((value) => value + 1)
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) {
          return
        }
        if (error instanceof ApiClientError && error.status === 404) {
          setNotFound(true)
        } else {
          setLoadError('Unable to load this income entry. Please try again.')
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

  async function handleSubmit(values: IncomeFormValues) {
    setSubmitting(true)
    setServerErrors({})
    try {
      const body = toIncomeWriteRequest(values)
      if (mode === 'create') {
        await createIncomeEntry(body)
        navigate('/transactions/income', {
          state: { successMessage: `Created income entry "${body.description}".` },
        })
        return
      }

      if (routeId === null) {
        setNotFound(true)
        return
      }

      await updateIncomeEntry(routeId, body)
      navigate('/transactions/income', {
        state: { successMessage: `Updated income entry "${body.description}".` },
      })
    } catch (error) {
      if (error instanceof ApiClientError) {
        setServerErrors(mapServerErrors(error))
      } else {
        setServerErrors({ form: 'Unable to save the income entry. Please try again.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="content-page">
        <p className="status-banner" role="status" aria-live="polite">
          {mode === 'create' ? 'Loading…' : 'Loading income entry…'}
        </p>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="content-page">
        <div className="status-panel" role="alert">
          <h1>Income entry not found</h1>
          <p>That income entry does not exist or the link is invalid.</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => navigate('/transactions/income')}
          >
            Back to income
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
            onClick={() => navigate('/transactions/income')}
          >
            Back to income
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="content-page">
      <IncomeForm
        key={formKey}
        mode={mode}
        initialValues={initialValues}
        submitting={submitting}
        serverErrors={serverErrors}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/transactions/income')}
      />
    </main>
  )
}
