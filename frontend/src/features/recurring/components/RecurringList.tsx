import { InfoTooltip } from '../../../components/InfoTooltip'
import {
  RecurringCatchUpControl,
  type CatchUpPreviewResult,
} from '../../../components/RecurringCatchUpControl'
import { ActionMenu, confirmDestructive } from '../../../components/ui/ActionMenu'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { daysUntil, dueDateStatus, isPastDate } from '../../../utils/dueDateUtils'
import { expenseDisplayTitle } from '../../../utils/expenseDisplay'
import { formatCurrency, formatIsoDate } from '../../../utils/moneyUtils'
import { CALCULATION_DEFS } from '../../guidance/calculationDefs'
import { HelpLink } from '../../guidance/HelpLink'
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

function paymentStatus(
  item: RecurringExpense,
  todayIso: string,
): { label: string; className: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' } {
  if (!item.active) {
    return { label: 'Inactive', className: 'inactive', tone: 'neutral' }
  }
  const status = dueDateStatus(daysUntil(item.nextPaymentDate, todayIso))
  const tone =
    status.className === 'overdue'
      ? 'danger'
      : status.className === 'due-today' || status.className === 'due-soon'
        ? 'warning'
        : 'info'
  return { ...status, tone }
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
        const catchUpId = `recurring-catchup-${item.id}`
        const title = expenseDisplayTitle(item.description, item.category.name)
        return (
          <li key={item.id} className="recurring-item list-row">
            <div className="list-row__main">
              <div className="recurring-item-header">
                <h3 className="list-row__title">{title}</h3>
                <strong className="list-row__amount">{formatCurrency(item.amount)}</strong>
              </div>
              <p className="recurring-meta list-row__meta">
                {item.category.name} ·{' '}
                <span className="cadence-with-info">
                  {cadenceLabel(item.cadence)}
                  <InfoTooltip label="About cadence">{CALCULATION_DEFS.cadence.short}</InfoTooltip>
                </span>{' '}
                · Next {formatIsoDate(item.nextPaymentDate)}
              </p>
              {item.merchant ? <p className="recurring-meta list-row__meta">Merchant: {item.merchant}</p> : null}
              {item.notes ? <p className="recurring-meta list-row__meta">{item.notes}</p> : null}
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              <InfoTooltip label="About Mark Paid">
                {CALCULATION_DEFS.markPaid.short}{' '}
                <HelpLink to="/settings/help?topic=how-mark-paid-works">Learn more</HelpLink>
              </InfoTooltip>
            </div>
            <div className="recurring-actions list-row__actions">
              <ActionMenu
                label={`Actions for ${title}`}
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
                          `Delete recurring expense “${title}”? This cannot be undone.`,
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
