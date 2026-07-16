import { Link } from 'react-router-dom'
import { resolveCategoryColor, softColorFromHex } from '../../../utils/categoryColor'
import type { Category } from '../types'

type CategoryListProps = {
  categories: Category[]
  deletingCategoryId: number | null
  onDelete: (category: Category) => void
}

export function CategoryList({
  categories,
  deletingCategoryId,
  onDelete,
}: CategoryListProps) {
  return (
    <ul className="category-list" aria-label="Categories">
      {categories.map((category) => {
        const isDeleting = deletingCategoryId === category.id
        const accent = resolveCategoryColor(category.name, category.color)
        return (
          <li
            key={category.id}
            className="category-row"
            style={{
              ['--category-accent' as string]: accent,
              ['--category-accent-soft' as string]: softColorFromHex(accent),
            }}
          >
            <div className="category-copy">
              <h2 className="category-name">
                <span className="category-swatch" aria-hidden="true" />
                {category.name}
              </h2>
              {category.description ? (
                <p className="category-description">{category.description}</p>
              ) : null}
              {category.budgetGroupLabel ? (
                <p className="field-hint">Budget group: {category.budgetGroupLabel}</p>
              ) : null}
            </div>
            <div className="category-actions">
              <Link
                className="button button-secondary"
                to={`/budgets/categories/${category.id}/edit`}
              >
                Edit
              </Link>
              <button
                type="button"
                className="button button-danger"
                onClick={() => onDelete(category)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
