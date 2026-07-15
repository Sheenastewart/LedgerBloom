import { Link } from 'react-router-dom'
import { formatCurrency, formatExpenseDate } from '../amountUtils'
import type { Expense } from '../types'

type ExpenseListProps = {
  expenses: Expense[]
  deletingExpenseId: number | null
  onDelete: (expense: Expense) => void
}

export function ExpenseList({ expenses, deletingExpenseId, onDelete }: ExpenseListProps) {
  return (
    <ul className="expense-list" aria-label="Expenses">
      {expenses.map((expense) => {
        const isDeleting = deletingExpenseId === expense.id
        return (
          <li key={expense.id} className="expense-row">
            <div className="expense-main">
              <h2 className="expense-description">{expense.description}</h2>
              <p className="expense-amount">{formatCurrency(expense.amount)}</p>
              <p className="expense-meta">
                {formatExpenseDate(expense.expenseDate)} · {expense.category.name}
              </p>
              {expense.merchant ? (
                <p className="expense-meta">Merchant: {expense.merchant}</p>
              ) : null}
              {expense.notes ? <p className="expense-meta">Notes: {expense.notes}</p> : null}
            </div>
            <div className="expense-actions">
              <Link className="button button-secondary" to={`/expenses/${expense.id}/edit`}>
                Edit
              </Link>
              <button
                type="button"
                className="button button-danger"
                onClick={() => onDelete(expense)}
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
