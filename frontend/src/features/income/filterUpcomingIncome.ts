import type { RecurringIncome } from '../recurringIncome/types'
import type { IncomeFilters } from './types'

/** Apply received/expected ledger filters to upcoming recurring income. */
export function filterUpcomingIncome(
  items: RecurringIncome[],
  filters: IncomeFilters,
): RecurringIncome[] {
  const sourceNeedle = filters.source?.trim().toLowerCase()
  const year = filters.year
  const month = filters.month

  return items.filter((item) => {
    if (sourceNeedle && !item.source.toLowerCase().includes(sourceNeedle)) {
      return false
    }
    if (year !== undefined && month !== undefined) {
      const [itemYear, itemMonth] = item.nextIncomeDate.split('-').map(Number)
      if (itemYear !== year || itemMonth !== month) {
        return false
      }
    }
    return true
  })
}
