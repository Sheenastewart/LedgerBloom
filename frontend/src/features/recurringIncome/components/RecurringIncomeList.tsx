import { InfoTooltip } from '../../../components/InfoTooltip'
import {
  RecurringCatchUpControl,
  type CatchUpPreviewResult,
} from '../../../components/RecurringCatchUpControl'
import { ActionMenu, confirmDestructive } from '../../../components/ui/ActionMenu'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { paths } from '../../../routes/paths'
import { isPastDate } from '../../../utils/dueDateUtils'
import { incomeDisplayParts, incomeSourceLabel } from '../../../utils/incomeDisplay'
import {
  displayRecurringAmount,
  perOccurrenceLabel,
} from '../../../utils/monthlyEquivalent'
import { formatCurrency } from '../../../utils/moneyUtils'
import { CALCULATION_DEFS } from '../../guidance/calculationDefs'
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
        const overdue = item.active && isPastDate(item.nextIncomeDate, todayIso)
        const catchUpId = `recurring-income-catchup-${item.id}`
        const display = incomeDisplayParts({
          description: item.description,
          source: item.source,
        })
        const fromLabel = incomeSourceLabel(display.source)
        const displayAmount = displayRecurringAmount(item.amount, item.cadence)
        const eachLabel = perOccurrenceLabel(item.amount, item.cadence)
        return (
          <li key={item.id} className="recurring-item list-row">
            <div className="list-row__main">
              <div className="recurring-item-header">
                <h3 className="list-row__title">{display.title}</h3>
                <strong className="list-row__amount">
                  {formatCurrency(displayAmount)}
                  {eachLabel ? '/mo' : null}
                </strong>
              </div>
              <p className="recurring-meta list-row__meta">
                {fromLabel ? `${fromLabel} · ` : null}
                <span className="cadence-with-info">
                  {cadenceLabel(item.cadence)}
                  <InfoTooltip label="About cadence">{CALCULATION_DEFS.cadence.short}</InfoTooltip>
                </span>
                {eachLabel ? ` · ${eachLabel}` : null}
              </p>
              {item.notes ? <p className="recurring-meta list-row__meta">{item.notes}</p> : null}
              {!item.active ? <StatusBadge tone="neutral">Inactive</StatusBadge> : null}
            </div>
            <div className="recurring-actions list-row__actions">
              <ActionMenu
                label={`Actions for ${display.title}`}
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
                          `Delete recurring income “${display.title}”? This cannot be undone.`,
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
