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
import { cadenceLabel, type RecurringIncome, type RecurringIncomeCatchUpResult } from '../types'

type RecurringIncomeListProps = {
  items: RecurringIncome[]
  todayIso: string
  markingReceivedId: number | null
  deletingId: number | null
  onMarkReceived: (item: RecurringIncome) => void
  onDelete: (item: RecurringIncome) => void
  onPreviewCatchUp: (item: RecurringIncome, signal: AbortSignal) => Promise<CatchUpPreviewResult>
  onSubmitCatchUp: (item: RecurringIncome, occurrenceDates: string[]) => Promise<RecurringIncomeCatchUpResult>
  onCatchUpRecorded: (item: RecurringIncome, result: RecurringIncomeCatchUpResult) => void
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
  onPreviewCatchUp,
  onSubmitCatchUp,
  onCatchUpRecorded,
}: RecurringIncomeListProps) {
  return (
    <ul className="recurring-list">
      {items.map((item) => {
        const status = incomeStatus(item, todayIso)
        const overdue = item.active && isPastDate(item.nextIncomeDate, todayIso)
        return (
          <li key={item.id} className="recurring-item">
            <div className="recurring-item-header">
              <h3>{item.description}</h3>
              <strong>{formatCurrency(item.amount)}</strong>
            </div>
            <p className="recurring-meta">
              {item.source} ·{' '}
              <span className="cadence-with-info">
                {cadenceLabel(item.cadence)}
                <InfoTooltip label="About cadence">{CALCULATION_DEFS.cadence.short}</InfoTooltip>
              </span>{' '}
              · Next {formatIsoDate(item.nextIncomeDate)}
            </p>
            {item.notes ? <p className="recurring-meta">{item.notes}</p> : null}
            <p className={`recurring-status ${status.className}`}>{status.label}</p>
            <div className="recurring-actions">
              <Link to={`/transactions/recurring-income/${item.id}/edit`} className="button button-secondary">
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
              <InfoTooltip label="About Mark Received">
                {CALCULATION_DEFS.markReceived.short}{' '}
                <HelpLink to="/settings/help?topic=how-mark-received-works">Learn more</HelpLink>
              </InfoTooltip>
              <button
                type="button"
                className="button button-secondary"
                disabled={deletingId === item.id || markingReceivedId === item.id}
                onClick={() => onDelete(item)}
              >
                {deletingId === item.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
            {overdue ? (
              <RecurringCatchUpControl
                idPrefix={`recurring-income-catchup-${item.id}`}
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
