import { ActionMenu, confirmDestructive } from '../../../components/ui/ActionMenu'
import { paths } from '../../../routes/paths'
import { resolveCategoryColor, softColorFromHex } from '../../../utils/categoryColor'
import { expenseDisplayParts } from '../../../utils/expenseDisplay'
import { userFacingNotes } from '../../../utils/notesUtils'
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
        const notes = userFacingNotes(expense.notes)
        const display = expenseDisplayParts({
          merchant: expense.merchant,
          description: expense.description,
          categoryName: expense.category.name,
        })
        const accent = resolveCategoryColor(expense.category.name, expense.category.color)
        return (
          <li
            key={expense.id}
            className="expense-row list-row"
            style={{
              ['--row-accent' as string]: accent,
              ['--row-accent-soft' as string]: softColorFromHex(accent),
            }}
          >
            <div className="expense-main list-row__main">
              <h2 className="expense-description list-row__title">{display.title}</h2>
              <p className="expense-amount list-row__amount is-expense">
                {formatCurrency(expense.amount)}
              </p>
              <p className="expense-meta list-row__meta">
                {formatExpenseDate(expense.expenseDate)}
                {display.categoryName ? ` · ${display.categoryName}` : null}
              </p>
              {display.paymentSource ? (
                <p className="expense-meta list-row__meta">Paid from {display.paymentSource}</p>
              ) : null}
              {notes ? <p className="expense-meta list-row__meta">Notes: {notes}</p> : null}
            </div>
            <div className="expense-actions list-row__actions">
              <ActionMenu
                label={`Actions for ${display.title}`}
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
                        description: expense.description ?? '',
                        merchant: expense.merchant ?? '',
                        amount: String(expense.amount),
                        expenseDate: expense.expenseDate,
                        categoryId: String(expense.category.id),
                        notes: notes ?? '',
                      },
                    },
                  },
                  {
                    id: 'convert',
                    label: 'Convert to recurring',
                    to: paths.transactionsRecurringExpenseNew,
                    state: {
                      prefill: {
                        description: expense.description ?? '',
                        merchant: expense.merchant ?? '',
                        amount: String(expense.amount),
                        categoryId: String(expense.category.id),
                        cadence: 'MONTHLY',
                        nextPaymentDate: expense.expenseDate,
                        active: true,
                        notes: notes ?? '',
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
                          `Delete expense “${display.title}”? This cannot be undone.`,
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
