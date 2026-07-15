import { Link } from 'react-router-dom'
import { daysUntil, dueDateStatus } from '../../../utils/dueDateUtils'
import { formatCurrency, formatIsoDate } from '../../../utils/moneyUtils'
import { cadenceLabel, type RecurringIncome } from '../types'

type RecurringIncomeListProps = {
  items: RecurringIncome[]
  todayIso: string
  markingReceivedId: number | null
  deletingId: number | null
  onMarkReceived: (item: RecurringIncome) => void
  onDelete: (item: RecurringIncome) => void
}

function incomeStatus(
  item: RecurringIncome,
  todayIso: string,
): { label: string; className: string } {
  if (!item.active) {
    return { label: 'Inactive', className: 'inactive' }
  }
  return dueDateStatus(daysUntil(item.nextIncomeDate, todayIso))
}

export function RecurringIncomeList({
  items,
  todayIso,
  markingReceivedId,
  deletingId,
  onMarkReceived,
  onDelete,
}: RecurringIncomeListProps) {
  return (
    <ul className="recurring-list">
      {items.map((item) => {
        const status = incomeStatus(item, todayIso)
        return (
          <li key={item.id} className="recurring-item">
            <div className="recurring-item-header">
              <h3>{item.description}</h3>
              <strong>{formatCurrency(item.amount)}</strong>
            </div>
            <p className="recurring-meta">
              {item.source} · {cadenceLabel(item.cadence)} · Next{' '}
              {formatIsoDate(item.nextIncomeDate)}
            </p>
            {item.notes ? <p className="recurring-meta">{item.notes}</p> : null}
            <p className={`recurring-status ${status.className}`}>{status.label}</p>
            <div className="recurring-actions">
              <Link to={`/recurring-income/${item.id}/edit`} className="button button-secondary">
                Edit
              </Link>
              <button
                type="button"
                className="button button-primary"
                disabled={
                  !item.active || markingReceivedId === item.id || deletingId === item.id
                }
                onClick={() => onMarkReceived(item)}
              >
                {markingReceivedId === item.id ? 'Marking received…' : 'Mark Received'}
              </button>
              <button
                type="button"
                className="button button-secondary"
                disabled={deletingId === item.id || markingReceivedId === item.id}
                onClick={() => onDelete(item)}
              >
                {deletingId === item.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
