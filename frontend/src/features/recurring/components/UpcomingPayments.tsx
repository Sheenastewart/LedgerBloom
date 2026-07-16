import { InfoTooltip } from '../../../components/InfoTooltip'
import { PeriodDetails } from '../../../components/PeriodDetails'
import { daysUntil, dueDateStatus } from '../../../utils/dueDateUtils'
import { expenseDisplayParts } from '../../../utils/expenseDisplay'
import { formatCurrency, formatIsoDate } from '../../../utils/moneyUtils'
import { cadenceLabel, type RecurringExpense } from '../types'
import { groupUpcomingPayments } from '../upcomingPaymentGroups'

type UpcomingPaymentsProps = {
  items: RecurringExpense[]
  todayIso: string
}

export function UpcomingPayments({ items, todayIso }: UpcomingPaymentsProps) {
  const groups = groupUpcomingPayments(items, todayIso)

  return (
    <section className="recurring-section" aria-label="Remaining bills by month">
      {groups.length === 0 ? (
        <p className="dashboard-empty" role="status">
          No remaining bills this month or next month.
        </p>
      ) : (
        <div className="upcoming-periods">
          {groups.map((group) => {
            const isPreview = group.id === 'nextMonth'
            return (
              <PeriodDetails
                key={group.id}
                className={`upcoming-period${isPreview ? ' upcoming-period--preview' : ''}`}
                defaultOpen={group.defaultOpen}
              >
                <summary className="upcoming-period__summary">
                  <span className="upcoming-period__title">
                    <span className="upcoming-period__label">
                      {isPreview ? "Next month's bills" : group.label}
                      {isPreview ? (
                        <span className="upcoming-period__preview-badge">Preview</span>
                      ) : null}
                    </span>
                    <span className="upcoming-period__range">
                      {isPreview
                        ? `${group.rangeLabel} · not in remaining total`
                        : group.rangeLabel}
                    </span>
                  </span>
                  <span className="upcoming-period__stats">
                    <span className="upcoming-period__count">
                      {group.items.length} {group.items.length === 1 ? 'payment' : 'payments'}
                    </span>
                    {isPreview ? (
                      <span className="upcoming-period__total upcoming-period__total--preview">
                        {formatCurrency(group.totalAmount)}
                      </span>
                    ) : (
                      <span className="upcoming-period__total">
                        {formatCurrency(group.totalAmount)}
                      </span>
                    )}
                  </span>
                </summary>
                {isPreview ? (
                  <p className="upcoming-period__preview-note">
                    Sneak peek only — these amounts are not included in Remaining expenses.
                    <InfoTooltip label="About next month preview">
                      Use this to spot quarterly or annual bills coming due soon. Your remaining
                      total above counts this month only.
                    </InfoTooltip>
                  </p>
                ) : null}
                <ul className="upcoming-list">
                  {group.items.map((item) => {
                    const status = dueDateStatus(daysUntil(item.nextPaymentDate, todayIso))
                    const display = expenseDisplayParts({
                      merchant: item.merchant,
                      description: item.description,
                      categoryName: item.category.name,
                    })
                    return (
                      <li key={`${item.id}-${item.nextPaymentDate}`} className="upcoming-item">
                        <p className="recurring-item-header">
                          <strong>{display.title}</strong>
                          <span>{formatCurrency(item.amount)}</span>
                        </p>
                        <p className="recurring-meta">
                          {formatIsoDate(item.nextPaymentDate)}
                          {display.categoryName ? ` · ${display.categoryName}` : null}
                          {' · '}
                          {cadenceLabel(item.cadence)}
                        </p>
                        {display.paymentSource ? (
                          <p className="recurring-meta">Paid from {display.paymentSource}</p>
                        ) : null}
                        <p className={`recurring-status ${status.className}`}>{status.label}</p>
                      </li>
                    )
                  })}
                </ul>
              </PeriodDetails>
            )
          })}
        </div>
      )}
    </section>
  )
}
