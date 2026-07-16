import { ActionMenu, confirmDestructive } from '../../../components/ui/ActionMenu'
import { paths } from '../../../routes/paths'
import { incomeDisplayParts, incomeSourceLabel } from '../../../utils/incomeDisplay'
import { formatCurrency, formatIsoDate } from '../../../utils/moneyUtils'
import { userFacingNotes } from '../../../utils/notesUtils'
import type { IncomeEntry } from '../types'

type IncomeListProps = {
  entries: IncomeEntry[]
  deletingIncomeId: number | null
  undoingIncomeId: number | null
  onDelete: (entry: IncomeEntry) => void
  onUndoReceived: (entry: IncomeEntry) => void
}

export function IncomeList({
  entries,
  deletingIncomeId,
  undoingIncomeId,
  onDelete,
  onUndoReceived,
}: IncomeListProps) {
  return (
    <ul className="income-list" aria-label="Income entries">
      {entries.map((entry) => {
        const isDeleting = deletingIncomeId === entry.id
        const isUndoing = undoingIncomeId === entry.id
        const fromRecurring = entry.recurringIncomeId != null
        const notes = userFacingNotes(entry.notes)
        const display = incomeDisplayParts({
          description: entry.description,
          source: entry.source,
        })
        const fromLabel = incomeSourceLabel(display.source)
        return (
          <li key={entry.id} className="income-row list-row income-row--accent">
            <div className="income-main list-row__main">
              <h2 className="income-description list-row__title">{display.title}</h2>
              <p className="income-amount list-row__amount is-income">
                {formatCurrency(entry.amount)}
              </p>
              <p className="income-meta list-row__meta">
                {formatIsoDate(entry.incomeDate)}
                {fromLabel ? ` · ${fromLabel}` : null}
              </p>
              {notes ? <p className="income-meta list-row__meta">Notes: {notes}</p> : null}
              {fromRecurring ? (
                <p className="income-meta list-row__meta">Recorded from a recurring schedule.</p>
              ) : null}
            </div>
            <div className="income-actions list-row__actions">
              <ActionMenu
                label={`Actions for ${display.title}`}
                items={[
                  {
                    id: 'edit',
                    label: 'Edit',
                    to: paths.transactionsIncomeEdit(entry.id),
                  },
                  ...(fromRecurring && entry.canUndoReceived
                    ? [
                        {
                          id: 'undo',
                          label: isUndoing ? 'Undoing…' : 'Undo receive',
                          disabled: isUndoing || isDeleting,
                          onSelect: () => onUndoReceived(entry),
                        },
                      ]
                    : []),
                  {
                    id: 'delete',
                    label: isDeleting ? 'Deleting…' : 'Delete',
                    kind: 'danger' as const,
                    disabled: isDeleting || isUndoing,
                    onSelect: () => {
                      if (
                        confirmDestructive(
                          `Delete income “${display.title}”? This cannot be undone.`,
                        )
                      ) {
                        onDelete(entry)
                      }
                    },
                  },
                ]}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
