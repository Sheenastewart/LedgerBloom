import { ActionMenu, confirmDestructive } from '../../../components/ui/ActionMenu'
import { paths } from '../../../routes/paths'
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
          <li key={expense.id} className="expense-row list-row">
            <div className="expense-main list-row__main">
              <h2 className="expense-description list-row__title">{expense.description}</h2>
              <p className="expense-amount list-row__amount">{formatCurrency(expense.amount)}</p>
              <p className="expense-meta list-row__meta">
                {formatExpenseDate(expense.expenseDate)} · {expense.category.name}
              </p>
              {expense.merchant ? (
                <p className="expense-meta list-row__meta">Merchant: {expense.merchant}</p>
              ) : null}
              {expense.notes ? <p className="expense-meta list-row__meta">Notes: {expense.notes}</p> : null}
            </div>
            <div className="expense-actions list-row__actions">
              <ActionMenu
                label={`Actions for ${expense.description}`}
                items={[
                  {
                    id: 'edit',
                    label: 'Edit',
                    to: paths.transactionsExpenseEdit(expense.id),
                  },
                  {
                    id: 'duplicate',
                    label: 'Duplicate',
                    to: paths.transactionsExpensesNew,
                    state: {
                      prefill: {
                        description: expense.description,
                        merchant: expense.merchant ?? '',
                        amount: String(expense.amount),
                        expenseDate: expense.expenseDate,
                        categoryId: String(expense.category.id),
                        notes: expense.notes ?? '',
                      },
                    },
                  },
                  {
                    id: 'convert',
                    label: 'Convert to recurring',
                    to: paths.transactionsRecurringExpenseNew,
                    state: {
                      prefill: {
                        description: expense.description,
                        merchant: expense.merchant ?? '',
                        amount: String(expense.amount),
                        categoryId: String(expense.category.id),
                        cadence: 'MONTHLY',
                        nextPaymentDate: expense.expenseDate,
                        active: true,
                        notes: expense.notes ?? '',
                        firstPaymentDay: '',
                        secondPaymentDay: '',
                        historyMode: '',
                        selectedOccurrenceDates: [],
                      },
                    },
                  },
                  {
                    id: 'delete',
                    label: isDeleting ? 'Deleting…' : 'Delete',
                    kind: 'danger',
                    disabled: isDeleting,
                    onSelect: () => {
                      if (
                        confirmDestructive(
                          `Delete expense “${expense.description}”? This cannot be undone.`,
                        )
                      ) {
                        onDelete(expense)
                      }
                    },
                  },
                ]}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
