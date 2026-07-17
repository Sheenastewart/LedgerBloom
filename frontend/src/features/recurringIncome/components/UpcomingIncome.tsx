import { InfoTooltip } from '../../../components/InfoTooltip'
import { PeriodDetails } from '../../../components/PeriodDetails'
import { daysUntil, expectedIncomeStatus } from '../../../utils/dueDateUtils'
import { incomeDisplayParts, incomeSourceLabel } from '../../../utils/incomeDisplay'
import { formatCurrency, formatIsoDate } from '../../../utils/moneyUtils'
import { MONTH_OPTIONS } from '../../../utils/periodFilterOptions'
import { groupUpcomingByNextDate } from '../../recurring/upcomingPaymentGroups'
import { cadenceLabel, type RecurringIncome } from '../types'

type FocusPeriod = {
  year: number
  month: number
}

type UpcomingIncomeProps = {
  items: RecurringIncome[]
  todayIso: string
  /** When set, show that calendar month as the expected period (not this/next relative to today). */
  focusPeriod?: FocusPeriod
}

function formatFocusLabel(period: FocusPeriod): string {
  const monthName =
    MONTH_OPTIONS.find((option) => option.value === String(period.month))?.label ??
    String(period.month)
  return `${monthName} ${period.year}`
}

function UpcomingIncomeRow({ item, todayIso }: { item: RecurringIncome; todayIso: string }) {
  const status = expectedIncomeStatus(daysUntil(item.nextIncomeDate, todayIso))
  const display = incomeDisplayParts({
    description: item.description,
    source: item.source,
  })
  const fromLabel = incomeSourceLabel(display.source)
  return (
    <li className="upcoming-item">
      <p className="recurring-item-header">
        <strong>{display.title}</strong>
        <span>{formatCurrency(item.amount)}</span>
      </p>
      <p className="recurring-meta">
        {formatIsoDate(item.nextIncomeDate)}
        {fromLabel ? ` · ${fromLabel}` : null} · {cadenceLabel(item.cadence)}
      </p>
      <p className={`recurring-status ${status.className}`}>{status.label}</p>
    </li>
  )
}

export function UpcomingIncome({ items, todayIso, focusPeriod }: UpcomingIncomeProps) {
  if (focusPeriod) {
    const rangeLabel = formatFocusLabel(focusPeriod)
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
    return (
      <section className="recurring-section" aria-label="Expected income by month">
        {items.length === 0 ? (
          <p className="dashboard-empty" role="status">
            No expected income for {rangeLabel}.
          </p>
        ) : (
          <div className="upcoming-periods">
            <PeriodDetails className="upcoming-period" defaultOpen>
              <summary className="upcoming-period__summary">
                <span className="upcoming-period__title">
                  <span className="upcoming-period__label">Expected for {rangeLabel}</span>
                  <span className="upcoming-period__range">{rangeLabel}</span>
                </span>
                <span className="upcoming-period__stats">
                  <span className="upcoming-period__count">
                    {items.length} {items.length === 1 ? 'paycheck' : 'paychecks'}
                  </span>
                  <span className="upcoming-period__total">{formatCurrency(totalAmount)}</span>
                </span>
              </summary>
              <ul className="upcoming-list">
                {items.map((item) => (
                  <UpcomingIncomeRow
                    key={`${item.id}-${item.nextIncomeDate}`}
                    item={item}
                    todayIso={todayIso}
                  />
                ))}
              </ul>
            </PeriodDetails>
          </div>
        )}
      </section>
    )
  }

  const groups = groupUpcomingByNextDate(items, todayIso, (item) => item.nextIncomeDate, {
    thisMonth: "This month's expected",
    nextMonth: "Next month's expected",
  })

  return (
    <section className="recurring-section" aria-label="Expected income by month">
      {groups.length === 0 ? (
        <p className="dashboard-empty" role="status">
          No expected income this month or next month.
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
                      {isPreview ? "Next month's expected" : group.label}
                      {isPreview ? (
                        <span className="upcoming-period__preview-badge">Preview</span>
                      ) : null}
                    </span>
                    <span className="upcoming-period__range">
                      {isPreview
                        ? `${group.rangeLabel} · not in expected total`
                        : group.rangeLabel}
                    </span>
                  </span>
                  <span className="upcoming-period__stats">
                    <span className="upcoming-period__count">
                      {group.items.length} {group.items.length === 1 ? 'paycheck' : 'paychecks'}
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
                    Sneak peek only — these amounts are not included in Expected income.
                    <InfoTooltip label="About next month preview">
                      Use this to spot quarterly or annual pay coming soon. Your expected total
                      above counts this month only.
                    </InfoTooltip>
                  </p>
                ) : null}
                <ul className="upcoming-list">
                  {group.items.map((item) => (
                    <UpcomingIncomeRow
                      key={`${item.id}-${item.nextIncomeDate}`}
                      item={item}
                      todayIso={todayIso}
                    />
                  ))}
                </ul>
              </PeriodDetails>
            )
          })}
        </div>
      )}
    </section>
  )
}
