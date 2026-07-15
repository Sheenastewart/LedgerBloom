import { formatCurrency, formatIsoDate } from '../../../utils/moneyUtils'
import { cadenceLabel, type RecurringExpense } from '../types'

type UpcomingPaymentsProps = {
  items: RecurringExpense[]
  todayIso: string
}

function daysUntil(dateIso: string, todayIso: string): number {
  const target = new Date(`${dateIso}T00:00:00`)
  const today = new Date(`${todayIso}T00:00:00`)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function UpcomingPayments({ items, todayIso }: UpcomingPaymentsProps) {
  return (
    <section className="recurring-section" aria-labelledby="upcoming-payments-heading">
      <h2 id="upcoming-payments-heading">Upcoming payments</h2>
      {items.length === 0 ? (
        <p className="dashboard-empty" role="status">
          No upcoming payments in the next 30 days.
        </p>
      ) : (
        <ul className="upcoming-list">
          {items.map((item) => {
            const delta = daysUntil(item.nextPaymentDate, todayIso)
            const status =
              delta < 0 ? 'Overdue' : delta <= 7 ? 'Due soon' : 'Upcoming'
            const statusClass =
              delta < 0 ? 'overdue' : delta <= 7 ? 'due-soon' : 'active'
            return (
              <li key={item.id} className="upcoming-item">
                <p className="recurring-item-header">
                  <strong>{item.description}</strong>
                  <span>{formatCurrency(item.amount)}</span>
                </p>
                <p className="recurring-meta">
                  {formatIsoDate(item.nextPaymentDate)} · {item.category.name} ·{' '}
                  {cadenceLabel(item.cadence)}
                </p>
                <p className={`recurring-status ${statusClass}`}>{status}</p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
