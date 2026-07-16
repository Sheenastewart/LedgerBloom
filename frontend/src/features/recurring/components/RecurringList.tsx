import { Link } from 'react-router-dom'
import { InfoTooltip } from '../../../components/InfoTooltip'
import {
  RecurringCatchUpControl,
  type CatchUpPreviewResult,
} from '../../../components/RecurringCatchUpControl'
import { daysUntil, dueDateStatus, isPastDate } from '../../../utils/dueDateUtils'
import { formatCurrency, formatIsoDate } from '../../../utils/moneyUtils'
import { CALCULATION_DEFS } from '../../guidance/calculationDefs'
import { HelpLink } from '../../guidance/HelpLink'
import { cadenceLabel, type RecurringExpense, type RecurringExpenseCatchUpResult } from '../types'

type RecurringListProps = {
  items: RecurringExpense[]
  todayIso: string
  markingPaidId: number | null
  deletingId: number | null
  onMarkPaid: (item: RecurringExpense) => void
  onDelete: (item: RecurringExpense) => void
  onPreviewCatchUp: (item: RecurringExpense, signal: AbortSignal) => Promise<CatchUpPreviewResult>
  onSubmitCatchUp: (item: RecurringExpense, occurrenceDates: string[]) => Promise<RecurringExpenseCatchUpResult>
  onCatchUpRecorded: (item: RecurringExpense, result: RecurringExpenseCatchUpResult) => void
}

function paymentStatus(
  item: RecurringExpense,
  todayIso: string,
): { label: string; className: string } {
  if (!item.active) {
    return { label: 'Inactive', className: 'inactive' }
  }
  return dueDateStatus(daysUntil(item.nextPaymentDate, todayIso))
}

export function RecurringList({
  items,
  todayIso,
  markingPaidId,
  deletingId,
  onMarkPaid,
  onDelete,
  onPreviewCatchUp,
  onSubmitCatchUp,
  onCatchUpRecorded,
}: RecurringListProps) {
  return (
    <ul className="recurring-list">
      {items.map((item) => {
        const status = paymentStatus(item, todayIso)
        const overdue = item.active && isPastDate(item.nextPaymentDate, todayIso)
        return (
          <li key={item.id} className="recurring-item">
            <div className="recurring-item-header">
              <h3>{item.description}</h3>
              <strong>{formatCurrency(item.amount)}</strong>
            </div>
            <p className="recurring-meta">
              {item.category.name} ·{' '}
              <span className="cadence-with-info">
                {cadenceLabel(item.cadence)}
                <InfoTooltip label="About cadence">{CALCULATION_DEFS.cadence.short}</InfoTooltip>
              </span>{' '}
              · Next {formatIsoDate(item.nextPaymentDate)}
            </p>
            {item.merchant ? <p className="recurring-meta">Merchant: {item.merchant}</p> : null}
            {item.notes ? <p className="recurring-meta">{item.notes}</p> : null}
            <p className={`recurring-status ${status.className}`}>{status.label}</p>
            <div className="recurring-actions">
              <Link to={`/transactions/recurring-expenses/${item.id}/edit`} className="button button-secondary">
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
              <InfoTooltip label="About Mark Paid">
                {CALCULATION_DEFS.markPaid.short}{' '}
                <HelpLink to="/settings/help?topic=how-mark-paid-works">Learn more</HelpLink>
              </InfoTooltip>
              <button
                type="button"
                className="button button-secondary"
                disabled={deletingId === item.id || markingPaidId === item.id}
                onClick={() => onDelete(item)}
              >
                {deletingId === item.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
            {overdue ? (
              <RecurringCatchUpControl
                idPrefix={`recurring-catchup-${item.id}`}
                loadPreview={(signal) => onPreviewCatchUp(item, signal)}
                submitCatchUp={(occurrenceDates) => onSubmitCatchUp(item, occurrenceDates)}
                onRecorded={(result) => onCatchUpRecorded(item, result)}
              />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
