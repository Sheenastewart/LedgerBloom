import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isAbortError } from '../../../api/ApiClientError'
import { deleteCategory, getCategories } from '../api/categoryApi'
import { CategoryList } from '../components/CategoryList'
import type { Category } from '../types'
import '../categories.css'

type LocationSuccessState = {
  successMessage?: string
}

export function CategoriesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null)
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

  const loadCategories = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCategories(signal)
      if (signal?.aborted) {
        return
      }
      setCategories(data)
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) {
        return
      }
      setError('Unable to load categories. Please try again.')
      setCategories([])
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadCategories(controller.signal)
    return () => controller.abort()
  }, [loadCategories])

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(
      `Delete category "${category.name}"? This cannot be undone.`,
    )
    if (!confirmed) {
      return
    }

    setDeleteError(null)
    setDeletingCategoryId(category.id)
    try {
      await deleteCategory(category.id)
      setCategories((current) => current.filter((item) => item.id !== category.id))
      setSuccessMessage(`Deleted category "${category.name}".`)
    } catch {
      setDeleteError(`Could not delete "${category.name}". Please try again.`)
    } finally {
      setDeletingCategoryId(null)
    }
  }

  return (
    <main className="content-page">
      <div className="page-header">
        <div>
          <h1>Categories</h1>
          <p className="page-subtitle">Organize spending into reusable labels.</p>
        </div>
        <Link to="/categories/new" className="button button-primary">
          Add category
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

      {loading ? (
        <p className="status-banner" role="status" aria-live="polite">
          Loading categories…
        </p>
      ) : null}

      {!loading && error ? (
        <div className="status-panel" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => void loadCategories()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error && categories.length === 0 ? (
        <div className="status-panel" role="status">
          <p>No categories yet. Create your first category to get started.</p>
          <Link to="/categories/new" className="button button-primary">
            Add category
          </Link>
        </div>
      ) : null}

      {!loading && !error && categories.length > 0 ? (
        <CategoryList
          categories={categories}
          deletingCategoryId={deletingCategoryId}
          onDelete={(category) => void handleDelete(category)}
        />
      ) : null}
    </main>
  )
}
