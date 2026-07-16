/** Dashboard helpers that only reshape existing API values for presentation. */

import { expenseDisplayParts } from '../../utils/expenseDisplay'
import { incomeDisplayParts, incomeSourceLabel } from '../../utils/incomeDisplay'
import { agendaGroupForDate, startOfTodayIso } from '../../utils/relativeDate'
import type { ActivityRowItem } from '../../components/ActivityRowList'
import { paths } from '../../routes/paths'

export function greetingForNow(now = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export { startOfTodayIso }

export function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setDate(date.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function isWithinNextDays(isoDate: string, todayIso: string, days: number): boolean {
  const end = addDaysIso(todayIso, days)
  return isoDate >= todayIso && isoDate <= end
}

export type ActivityItem = {
  id: string
  kind: 'expense' | 'income'
  description: string
  amount: number
  date: string
  detail: string
  merchant?: string | null
  subtitle?: string | null
  categoryColor?: string | null
  recurring?: boolean
}

export function mergeRecentActivity(
  expenses: Array<{
    id: number
    description: string | null
    merchant?: string | null
    amount: number
    expenseDate: string
    category: { name: string; color?: string | null }
  }>,
  incomes: Array<{
    id: number
    description: string
    amount: number
    incomeDate: string
    source: string
    recurringIncomeId?: number | null
  }>,
  limit = 8,
): ActivityItem[] {
  const expenseItems: ActivityItem[] = expenses.map((item) => {
    const display = expenseDisplayParts({
      merchant: item.merchant,
      description: item.description,
      categoryName: item.category.name,
    })
    return {
      id: `expense-${item.id}`,
      kind: 'expense' as const,
      description: display.title,
      amount: item.amount,
      date: item.expenseDate,
      detail: display.categoryName ?? item.category.name,
      merchant: item.merchant,
      subtitle: display.paymentSource,
      categoryColor: item.category.color,
    }
  })
  const incomeItems: ActivityItem[] = incomes.map((item) => {
    const display = incomeDisplayParts({
      description: item.description,
      source: item.source,
    })
    return {
      id: `income-${item.id}`,
      kind: 'income' as const,
      description: display.title,
      amount: item.amount,
      date: item.incomeDate,
      detail: display.source ?? '',
      subtitle: display.source,
      recurring: item.recurringIncomeId != null,
    }
  })
  return [...expenseItems, ...incomeItems]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id.localeCompare(b.id)))
    .slice(0, limit)
}

export function activityItemsToRows(items: ActivityItem[]): ActivityRowItem[] {
  return items.map((item) => ({
    id: item.id,
    kind: item.kind,
    title: item.description,
    subtitle: item.subtitle,
    categoryName: item.detail,
    categoryColor: item.categoryColor,
    date: item.date,
    amount: item.amount,
    href:
      item.kind === 'expense'
        ? paths.transactionsExpenseEdit(Number(item.id.replace('expense-', '')))
        : paths.transactionsIncomeEdit(Number(item.id.replace('income-', ''))),
    recurring: item.recurring,
  }))
}

export type AgendaItem = {
  id: string
  kind: 'payment' | 'income'
  scheduleId: number
  label: string
  amount: number
  date: string
  detail: string
  group: 'overdue' | 'today' | 'tomorrow' | 'week' | 'later'
}

export function buildAgenda(args: {
  expenseItems: Array<{
    id: number
    description: string | null
    merchant?: string | null
    categoryName: string
    amount: number
    nextPaymentDate: string
    cadence?: string
  }>
  incomeItems: Array<{
    id: number
    description: string
    source: string
    amount: number
    nextIncomeDate: string
  }>
  todayIso?: string
}): AgendaItem[] {
  const today = args.todayIso ?? startOfTodayIso()
  const expenses: AgendaItem[] = args.expenseItems.map((item) => {
    const display = expenseDisplayParts({
      merchant: item.merchant,
      description: item.description,
      categoryName: item.categoryName,
    })
    return {
      id: `exp-${item.id}-${item.nextPaymentDate}`,
      kind: 'payment' as const,
      scheduleId: item.id,
      label: display.title,
      amount: item.amount,
      date: item.nextPaymentDate,
      detail: [display.categoryName, item.cadence, display.paymentSource].filter(Boolean).join(' · '),
      group: agendaGroupForDate(item.nextPaymentDate, today),
    }
  })
  const incomes: AgendaItem[] = args.incomeItems.map((item) => {
    const display = incomeDisplayParts({
      description: item.description,
      source: item.source,
    })
    return {
      id: `inc-${item.id}-${item.nextIncomeDate}`,
      kind: 'income' as const,
      scheduleId: item.id,
      label: display.title,
      amount: item.amount,
      date: item.nextIncomeDate,
      detail: incomeSourceLabel(display.source) ?? '',
      group: agendaGroupForDate(item.nextIncomeDate, today),
    }
  })
  return [...expenses, ...incomes]
    .filter((item) => item.group !== 'later')
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Safe to spend = budget remaining after bills due this week (presentation only). */
export function safeToSpend(remainingBudget: number | null, billsDueThisWeek: number): number | null {
  if (remainingBudget === null) return null
  return remainingBudget - billsDueThisWeek
}
