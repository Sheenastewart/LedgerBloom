import { InfoTooltip } from '../../../components/InfoTooltip'
import { daysUntil, dueDateStatus } from '../../../utils/dueDateUtils'
import { formatCurrency, formatIsoDate } from '../../../utils/moneyUtils'
import { cadenceLabel, type RecurringExpense } from '../types'

type UpcomingPaymentsProps = {
  items: RecurringExpense[]
  todayIso: string
}

export function UpcomingPayments({ items, todayIso }: UpcomingPaymentsProps) {
  return (
    <section className="recurring-section" aria-labelledby="upcoming-payments-heading">
      <h2 id="upcoming-payments-heading" className="metric-heading">
        Upcoming payments
        <InfoTooltip label="About upcoming payments">
          Active recurring expense schedules due in the selected window.
        </InfoTooltip>
      </h2>
      {items.length === 0 ? (
        <p className="dashboard-empty" role="status">
          No upcoming payments in the next 30 days.
        </p>
      ) : (
        <ul className="upcoming-list">
          {items.map((item) => {
            const status = dueDateStatus(daysUntil(item.nextPaymentDate, todayIso))
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
                <p className={`recurring-status ${status.className}`}>{status.label}</p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
