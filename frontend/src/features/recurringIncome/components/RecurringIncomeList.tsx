import { InfoTooltip } from '../../../components/InfoTooltip'
import {
  RecurringCatchUpControl,
  type CatchUpPreviewResult,
} from '../../../components/RecurringCatchUpControl'
import { ActionMenu, confirmDestructive } from '../../../components/ui/ActionMenu'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { paths } from '../../../routes/paths'
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
): { label: string; className: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' } {
  if (!item.active) {
    return { label: 'Inactive', className: 'inactive', tone: 'neutral' }
  }
  const status = dueDateStatus(daysUntil(item.nextIncomeDate, todayIso))
  const tone =
    status.className === 'overdue'
      ? 'danger'
      : status.className === 'due-today' || status.className === 'due-soon'
        ? 'warning'
        : 'info'
  return { ...status, tone }
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
        const catchUpId = `recurring-income-catchup-${item.id}`
        return (
          <li key={item.id} className="recurring-item list-row">
            <div className="list-row__main">
              <div className="recurring-item-header">
                <h3 className="list-row__title">{item.description}</h3>
                <strong className="list-row__amount">{formatCurrency(item.amount)}</strong>
              </div>
              <p className="recurring-meta list-row__meta">
                {item.source} ·{' '}
                <span className="cadence-with-info">
                  {cadenceLabel(item.cadence)}
                  <InfoTooltip label="About cadence">{CALCULATION_DEFS.cadence.short}</InfoTooltip>
                </span>{' '}
                · Next {formatIsoDate(item.nextIncomeDate)}
              </p>
              {item.notes ? <p className="recurring-meta list-row__meta">{item.notes}</p> : null}
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              <InfoTooltip label="About Mark Received">
                {CALCULATION_DEFS.markReceived.short}{' '}
                <HelpLink to="/settings/help?topic=how-mark-received-works">Learn more</HelpLink>
              </InfoTooltip>
            </div>
            <div className="recurring-actions list-row__actions">
              <ActionMenu
                label={`Actions for ${item.description}`}
                items={[
                  {
                    id: 'edit',
                    label: 'Edit',
                    to: paths.transactionsRecurringIncomeEdit(item.id),
                  },
                  {
                    id: 'mark-received',
                    label: markingReceivedId === item.id ? 'Marking received…' : 'Mark Received',
                    disabled:
                      !item.active || markingReceivedId === item.id || deletingId === item.id,
                    onSelect: () => onMarkReceived(item),
                  },
                  ...(overdue
                    ? [
                        {
                          id: 'import',
                          label: 'Import Previous Payments',
                          onSelect: () => {
                            document
                              .getElementById(catchUpId)
                              ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                            document
                              .querySelector<HTMLButtonElement>(`#${catchUpId} button`)
                              ?.focus()
                          },
                        },
                      ]
                    : []),
                  {
                    id: 'delete',
                    label: deletingId === item.id ? 'Deleting…' : 'Delete',
                    kind: 'danger',
                    disabled: deletingId === item.id || markingReceivedId === item.id,
                    onSelect: () => {
                      if (
                        confirmDestructive(
                          `Delete recurring income “${item.description}”? This cannot be undone.`,
                        )
                      ) {
                        onDelete(item)
                      }
                    },
                  },
                ]}
              />
            </div>
            {overdue ? (
              <div id={catchUpId} className="recurring-catchup-slot">
                <RecurringCatchUpControl
                  idPrefix={catchUpId}
                  loadPreview={(signal) => onPreviewCatchUp(item, signal)}
                  submitCatchUp={(occurrenceDates) => onSubmitCatchUp(item, occurrenceDates)}
                  onRecorded={(result) => onCatchUpRecorded(item, result)}
                />
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
