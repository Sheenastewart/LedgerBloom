import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isAbortError } from '../../../api/ApiClientError'
import { Alert, EmptyState, ErrorPanel, LoadingState, SuccessBanner } from '../../../components/ui/Feedback'
import { HelpLink } from '../../guidance/HelpLink'
import { deleteCategory, getCategories, addStarterCategories } from '../api/categoryApi'
import { CategoryList } from '../components/CategoryList'
import type { Category } from '../types'
import '../categories.css'
import '../../guidance/help.css'

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
  const [addingStarter, setAddingStarter] = useState(false)
  const [starterError, setStarterError] = useState<string | null>(null)

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

  async function handleAddStarterCategories() {
    const confirmed = window.confirm(
      'Add common everyday expense categories such as Housing, Groceries, and Utilities? Existing categories with the same name will be kept.',
    )
    if (!confirmed) {
      return
    }

    setStarterError(null)
    setAddingStarter(true)
    try {
      const result = await addStarterCategories()
      await loadCategories()
      if (result.createdCount === 0) {
        setSuccessMessage('All starter categories already exist. Nothing was added.')
      } else {
        const skippedSuffix =
          result.skippedCount > 0
            ? ` Skipped ${result.skippedCount} that already existed.`
            : ''
        setSuccessMessage(`Added ${result.createdCount} starter categories.${skippedSuffix}`)
      }
    } catch {
      setStarterError('Unable to add starter categories. Please try again.')
    } finally {
      setAddingStarter(false)
    }
  }

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
          <HelpLink to="/settings/help?topic=why-category-cannot-delete">
            Why can’t I delete this category?
          </HelpLink>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="button button-secondary"
            disabled={addingStarter}
            onClick={() => void handleAddStarterCategories()}
          >
            {addingStarter ? 'Adding starter categories…' : 'Add starter categories'}
          </button>
          <Link to="/budgets/categories/new" className="button button-primary">
            Add category
          </Link>
        </div>
      </div>

      {starterError ? (
        <Alert tone="error" role="alert">
          {starterError}
        </Alert>
      ) : null}

      {successMessage ? <SuccessBanner>{successMessage}</SuccessBanner> : null}

      {deleteError ? (
        <Alert tone="error" role="alert">
          {deleteError}
        </Alert>
      ) : null}

      {loading ? <LoadingState withSkeleton>Loading categories…</LoadingState> : null}

      {!loading && error ? (
        <ErrorPanel onRetry={() => void loadCategories()}>
          <p>{error}</p>
        </ErrorPanel>
      ) : null}

      {!loading && !error && categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          action={
            <div className="form-actions">
              <button
                type="button"
                className="button button-secondary"
                disabled={addingStarter}
                onClick={() => void handleAddStarterCategories()}
              >
                Add starter categories
              </button>
              <Link to="/budgets/categories/new" className="button button-primary">
                Add category
              </Link>
            </div>
          }
        >
          Add starter categories for common everyday spending, or create your own labels.
        </EmptyState>
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
