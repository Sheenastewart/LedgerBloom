import { ActionMenu, confirmDestructive } from '../../../components/ui/ActionMenu'
import { paths } from '../../../routes/paths'
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
        return (
          <li key={entry.id} className="income-row list-row">
            <div className="income-main list-row__main">
              <h2 className="income-description list-row__title">{entry.description}</h2>
              <p className="income-amount list-row__amount">{formatCurrency(entry.amount)}</p>
              <p className="income-meta list-row__meta">
                {formatIsoDate(entry.incomeDate)} · {entry.source}
              </p>
              {notes ? <p className="income-meta list-row__meta">Notes: {notes}</p> : null}
              {fromRecurring ? (
                <p className="income-meta list-row__meta">Recorded from a recurring schedule.</p>
              ) : null}
            </div>
            <div className="income-actions list-row__actions">
              <ActionMenu
                label={`Actions for ${entry.description}`}
                items={[
                  {
                    id: 'edit',
                    label: 'Edit',
                    to: paths.transactionsIncomeEdit(entry.id),
                  },
                  {
                    id: 'duplicate',
                    label: 'Duplicate',
                    to: paths.transactionsIncomeNew,
                    state: {
                      prefill: {
                        description: entry.description,
                        source: entry.source,
                        amount: String(entry.amount),
                        incomeDate: entry.incomeDate,
                        notes: notes ?? '',
                      },
                    },
                  },
                  {
                    id: 'convert',
                    label: 'Convert to recurring',
                    to: paths.transactionsRecurringIncomeNew,
                    state: {
                      prefill: {
                        description: entry.description,
                        source: entry.source,
                        amount: String(entry.amount),
                        cadence: 'MONTHLY',
                        nextIncomeDate: entry.incomeDate,
                        active: true,
                        notes: notes ?? '',
                      },
                    },
                  },
                  ...(fromRecurring
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
                          `Delete income “${entry.description}”? This cannot be undone.`,
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
