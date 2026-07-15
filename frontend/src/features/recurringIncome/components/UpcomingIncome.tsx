import { daysUntil, dueDateStatus } from '../../../utils/dueDateUtils'
import { formatCurrency, formatIsoDate } from '../../../utils/moneyUtils'
import { cadenceLabel, type RecurringIncome } from '../types'

type UpcomingIncomeProps = {
  items: RecurringIncome[]
  todayIso: string
}

export function UpcomingIncome({ items, todayIso }: UpcomingIncomeProps) {
  return (
    <section className="recurring-section" aria-labelledby="upcoming-income-heading">
      <h2 id="upcoming-income-heading">Upcoming income</h2>
      {items.length === 0 ? (
        <p className="dashboard-empty" role="status">
          No upcoming income in the next 30 days.
        </p>
      ) : (
        <ul className="upcoming-list">
          {items.map((item) => {
            const status = dueDateStatus(daysUntil(item.nextIncomeDate, todayIso))
            return (
              <li key={item.id} className="upcoming-item">
                <p className="recurring-item-header">
                  <strong>{item.description}</strong>
                  <span>{formatCurrency(item.amount)}</span>
                </p>
                <p className="recurring-meta">
                  {formatIsoDate(item.nextIncomeDate)} · {item.source} ·{' '}
                  {cadenceLabel(item.cadence)}
                </p>
                <p className={`recurring-status ${status.className}`}>{status.label}</p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
