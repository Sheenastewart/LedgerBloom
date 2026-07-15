import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiClientError, isAbortError } from '../../../api/ApiClientError'
import {
  createCategory,
  getCategory,
  updateCategory,
} from '../api/categoryApi'
import { CategoryForm } from '../components/CategoryForm'
import { parseCategoryRouteId } from '../parseCategoryRouteId'
import type { CategoryFormErrors, CategoryFormValues } from '../types'
import '../categories.css'

type CategoryFormPageProps = {
  mode: 'create' | 'edit'
}

function toWriteRequest(values: CategoryFormValues) {
  const description = values.description.trim()
  return {
    name: values.name.trim(),
    description: description.length === 0 ? null : description,
  }
}

function mapServerErrors(error: ApiClientError): CategoryFormErrors {
  const next: CategoryFormErrors = {}

  for (const fieldError of error.fieldErrors) {
    if (fieldError.field === 'name' || fieldError.field === 'description') {
      next[fieldError.field] = fieldError.message
    }
  }

  if (error.code === 'CATEGORY_NAME_ALREADY_EXISTS') {
    next.name = error.message
  } else if (!next.name && !next.description) {
    next.form = error.message
  }

  return next
}

export function CategoryFormPage({ mode }: CategoryFormPageProps) {
  const navigate = useNavigate()
  const params = useParams()
  const routeId = mode === 'edit' ? parseCategoryRouteId(params.id) : null

  const [loading, setLoading] = useState(mode === 'edit')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(mode === 'edit' && routeId === null)
  const [submitting, setSubmitting] = useState(false)
  const [serverErrors, setServerErrors] = useState<CategoryFormErrors>({})
  const [initialValues, setInitialValues] = useState<CategoryFormValues>({
    name: '',
    description: '',
  })
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    if (mode !== 'edit') {
      return
    }

    if (routeId === null) {
      setNotFound(true)
      setLoading(false)
      return
    }

    const categoryId = routeId
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setLoadError(null)
      setNotFound(false)
      try {
        const category = await getCategory(categoryId, controller.signal)
        if (controller.signal.aborted) {
          return
        }
        setInitialValues({
          name: category.name,
          description: category.description ?? '',
        })
        setFormKey((value) => value + 1)
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) {
          return
        }
        if (error instanceof ApiClientError && error.status === 404) {
          setNotFound(true)
        } else {
          setLoadError('Unable to load this category. Please try again.')
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

  async function handleSubmit(values: CategoryFormValues) {
    setSubmitting(true)
    setServerErrors({})
    try {
      const body = toWriteRequest(values)
      if (mode === 'create') {
        await createCategory(body)
        navigate('/categories', {
          state: { successMessage: `Created category "${body.name}".` },
        })
        return
      }

      if (routeId === null) {
        setNotFound(true)
        return
      }

      await updateCategory(routeId, body)
      navigate('/categories', {
        state: { successMessage: `Updated category "${body.name}".` },
      })
    } catch (error) {
      if (error instanceof ApiClientError) {
        setServerErrors(mapServerErrors(error))
      } else {
        setServerErrors({ form: 'Unable to save the category. Please try again.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="content-page">
        <p className="status-banner" role="status" aria-live="polite">
          Loading category…
        </p>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="content-page">
        <div className="status-panel" role="alert">
          <h1>Category not found</h1>
          <p>That category does not exist or the link is invalid.</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => navigate('/categories')}
          >
            Back to categories
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
            onClick={() => navigate('/categories')}
          >
            Back to categories
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="content-page">
      <CategoryForm
        key={formKey}
        mode={mode}
        initialValues={initialValues}
        submitting={submitting}
        serverErrors={serverErrors}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/categories')}
      />
    </main>
  )
}
