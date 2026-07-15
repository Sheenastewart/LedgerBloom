import { Link } from 'react-router-dom'
import { formatCurrency, formatIsoDate } from '../../../utils/moneyUtils'
import { cadenceLabel, type RecurringExpense } from '../types'

type RecurringListProps = {
  items: RecurringExpense[]
  todayIso: string
  markingPaidId: number | null
  deletingId: number | null
  onMarkPaid: (item: RecurringExpense) => void
  onDelete: (item: RecurringExpense) => void
}

function daysUntil(dateIso: string, todayIso: string): number {
  const target = new Date(`${dateIso}T00:00:00`)
  const today = new Date(`${todayIso}T00:00:00`)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function paymentStatus(
  item: RecurringExpense,
  todayIso: string,
): { label: string; className: string } {
  if (!item.active) {
    return { label: 'Inactive', className: 'inactive' }
  }
  const delta = daysUntil(item.nextPaymentDate, todayIso)
  if (delta < 0) {
    return { label: 'Overdue', className: 'overdue' }
  }
  if (delta <= 7) {
    return { label: 'Due soon', className: 'due-soon' }
  }
  return { label: 'Active', className: 'active' }
}

export function RecurringList({
  items,
  todayIso,
  markingPaidId,
  deletingId,
  onMarkPaid,
  onDelete,
}: RecurringListProps) {
  return (
    <ul className="recurring-list">
      {items.map((item) => {
        const status = paymentStatus(item, todayIso)
        return (
          <li key={item.id} className="recurring-item">
            <div className="recurring-item-header">
              <h3>{item.description}</h3>
              <strong>{formatCurrency(item.amount)}</strong>
            </div>
            <p className="recurring-meta">
              {item.category.name} · {cadenceLabel(item.cadence)} · Next{' '}
              {formatIsoDate(item.nextPaymentDate)}
            </p>
            {item.merchant ? <p className="recurring-meta">Merchant: {item.merchant}</p> : null}
            {item.notes ? <p className="recurring-meta">{item.notes}</p> : null}
            <p className={`recurring-status ${status.className}`}>{status.label}</p>
            <div className="recurring-actions">
              <Link to={`/recurring/${item.id}/edit`} className="button button-secondary">
                Edit
              </Link>
              <button
                type="button"
                className="button button-primary"
                disabled={!item.active || markingPaidId === item.id || deletingId === item.id}
                onClick={() => onMarkPaid(item)}
              >
                {markingPaidId === item.id ? 'Marking paid…' : 'Mark Paid'}
              </button>
              <button
                type="button"
                className="button button-secondary"
                disabled={deletingId === item.id || markingPaidId === item.id}
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
