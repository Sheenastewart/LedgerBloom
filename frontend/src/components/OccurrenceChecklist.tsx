import { formatCurrency, formatIsoDate } from '../utils/moneyUtils'

export type OccurrenceChecklistOption = {
  date: string
  amount: number
}

type OccurrenceChecklistProps = {
  idPrefix: string
  items: OccurrenceChecklistOption[]
  selected: Set<string>
  onToggle: (date: string) => void
  disabled?: boolean
}

/** Checklist of past cadence occurrences (date + amount) used by both create-time history review and catch-up flows. */
export function OccurrenceChecklist({
  idPrefix,
  items,
  selected,
  onToggle,
  disabled = false,
}: OccurrenceChecklistProps) {
  return (
    <ul className="occurrence-checklist">
      {items.map((item) => {
        const inputId = `${idPrefix}-${item.date}`
        return (
          <li key={item.date} className="occurrence-checklist-item">
            <label htmlFor={inputId}>
              <input
                id={inputId}
                type="checkbox"
                checked={selected.has(item.date)}
                disabled={disabled}
                onChange={() => onToggle(item.date)}
              />
              <span className="occurrence-checklist-date">{formatIsoDate(item.date)}</span>
              <span className="occurrence-checklist-amount">{formatCurrency(item.amount)}</span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}
