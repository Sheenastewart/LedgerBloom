import { Link } from 'react-router-dom'
import { formatCurrency, formatIsoDate } from '../../../utils/moneyUtils'
import type { IncomeEntry } from '../types'

type IncomeListProps = {
  entries: IncomeEntry[]
  deletingIncomeId: number | null
  undoingIncomeId: number | null
  onDelete: (entry: IncomeEntry) => void
  onUndoReceived: (entry: IncomeEntry) => void
}

export function IncomeList({
  entries,
  deletingIncomeId,
  undoingIncomeId,
  onDelete,
  onUndoReceived,
}: IncomeListProps) {
  return (
    <ul className="income-list" aria-label="Income entries">
      {entries.map((entry) => {
        const isDeleting = deletingIncomeId === entry.id
        const isUndoing = undoingIncomeId === entry.id
        const fromRecurring = entry.recurringIncomeId != null
        return (
          <li key={entry.id} className="income-row">
            <div className="income-main">
              <h2 className="income-description">{entry.description}</h2>
              <p className="income-amount">{formatCurrency(entry.amount)}</p>
              <p className="income-meta">
                {formatIsoDate(entry.incomeDate)} · {entry.source}
              </p>
              {entry.notes ? <p className="income-meta">Notes: {entry.notes}</p> : null}
              {fromRecurring ? (
                <p className="income-meta">Recorded from a recurring schedule.</p>
              ) : null}
            </div>
            <div className="income-actions">
              <Link className="button button-secondary" to={`/income/${entry.id}/edit`}>
                Edit
              </Link>
              {fromRecurring ? (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => onUndoReceived(entry)}
                  disabled={isUndoing || isDeleting}
                >
                  {isUndoing ? 'Undoing…' : 'Undo receive'}
                </button>
              ) : null}
              <button
                type="button"
                className="button button-danger"
                onClick={() => onDelete(entry)}
                disabled={isDeleting || isUndoing}
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
