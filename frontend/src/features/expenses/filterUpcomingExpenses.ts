import type { RecurringExpense } from '../recurring/types'
import type { ExpenseFilters } from './types'

/** Apply page filters to remaining (upcoming) expense schedules. */
export function filterUpcomingExpenses(
  items: RecurringExpense[],
  filters: ExpenseFilters,
): RecurringExpense[] {
  const categoryId = filters.categoryId
  const year = filters.year
  const month = filters.month

  return items.filter((item) => {
    if (categoryId !== undefined && item.category.id !== categoryId) {
      return false
    }
    if (year !== undefined && month !== undefined) {
      const [itemYear, itemMonth] = item.nextPaymentDate.split('-').map(Number)
      if (itemYear !== year || itemMonth !== month) {
        return false
      }
    }
    return true
  })
}
