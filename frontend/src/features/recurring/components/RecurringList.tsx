import { InfoTooltip } from '../../../components/InfoTooltip'
import {
  RecurringCatchUpControl,
  type CatchUpPreviewResult,
} from '../../../components/RecurringCatchUpControl'
import { ActionMenu, confirmDestructive } from '../../../components/ui/ActionMenu'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { isPastDate } from '../../../utils/dueDateUtils'
import { expenseDisplayParts } from '../../../utils/expenseDisplay'
import {
  displayRecurringAmount,
  perOccurrenceLabel,
} from '../../../utils/monthlyEquivalent'
import { formatCurrency } from '../../../utils/moneyUtils'
import { CALCULATION_DEFS } from '../../guidance/calculationDefs'
import { paths } from '../../../routes/paths'
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
        const overdue = item.active && isPastDate(item.nextPaymentDate, todayIso)
        const catchUpId = `recurring-catchup-${item.id}`
        const display = expenseDisplayParts({
          merchant: item.merchant,
          description: item.description,
          categoryName: item.category.name,
        })
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
                {display.categoryName ? `${display.categoryName} · ` : null}
                <span className="cadence-with-info">
                  {cadenceLabel(item.cadence)}
                  <InfoTooltip label="About cadence">{CALCULATION_DEFS.cadence.short}</InfoTooltip>
                </span>
                {eachLabel ? ` · ${eachLabel}` : null}
              </p>
              {display.paymentSource ? (
                <p className="recurring-meta list-row__meta">Paid from {display.paymentSource}</p>
              ) : null}
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
                    to: paths.transactionsRecurringExpenseEdit(item.id),
                  },
                  {
                    id: 'mark-paid',
                    label: markingPaidId === item.id ? 'Marking paid…' : 'Mark Paid',
                    disabled: !item.active || markingPaidId === item.id || deletingId === item.id,
                    onSelect: () => onMarkPaid(item),
                  },
                  ...(overdue
                    ? [
                        {
                          id: 'import',
                          label: 'Import Previous Payments',
                          onSelect: () => {
                            document.getElementById(catchUpId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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
                    disabled: deletingId === item.id || markingPaidId === item.id,
                    onSelect: () => {
                      if (
                        confirmDestructive(
                          `Delete recurring expense “${display.title}”? This cannot be undone.`,
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
