/** Dashboard helpers that only reshape existing API values for presentation. */

import { expenseDisplayTitle } from '../../utils/expenseDisplay'
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
  recurring?: boolean
}

export function mergeRecentActivity(
  expenses: Array<{
    id: number
    description: string | null
    merchant?: string | null
    amount: number
    expenseDate: string
    category: { name: string }
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
  const expenseItems: ActivityItem[] = expenses.map((item) => ({
    id: `expense-${item.id}`,
    kind: 'expense',
    description: expenseDisplayTitle(item.description, item.category.name),
    amount: item.amount,
    date: item.expenseDate,
    detail: item.category.name,
    merchant: item.merchant,
  }))
  const incomeItems: ActivityItem[] = incomes.map((item) => ({
    id: `income-${item.id}`,
    kind: 'income',
    description: item.description,
    amount: item.amount,
    date: item.incomeDate,
    detail: item.source,
    merchant: item.source,
    recurring: item.recurringIncomeId != null,
  }))
  return [...expenseItems, ...incomeItems]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id.localeCompare(b.id)))
    .slice(0, limit)
}

export function activityItemsToRows(items: ActivityItem[]): ActivityRowItem[] {
  return items.map((item) => ({
    id: item.id,
    kind: item.kind,
    title: item.description,
    merchant: item.kind === 'expense' ? item.merchant : null,
    categoryName: item.detail,
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
    categoryName: string
    amount: number
    nextPaymentDate: string
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
  const expenses: AgendaItem[] = args.expenseItems.map((item) => ({
    id: `exp-${item.id}-${item.nextPaymentDate}`,
    kind: 'payment' as const,
    scheduleId: item.id,
    label: expenseDisplayTitle(item.description, item.categoryName),
    amount: item.amount,
    date: item.nextPaymentDate,
    detail: item.categoryName,
    group: agendaGroupForDate(item.nextPaymentDate, today),
  }))
  const incomes: AgendaItem[] = args.incomeItems.map((item) => ({
    id: `inc-${item.id}-${item.nextIncomeDate}`,
    kind: 'income' as const,
    scheduleId: item.id,
    label: item.description,
    amount: item.amount,
    date: item.nextIncomeDate,
    detail: item.source,
    group: agendaGroupForDate(item.nextIncomeDate, today),
  }))
  return [...expenses, ...incomes]
    .filter((item) => item.group !== 'later')
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Safe to spend = budget remaining after bills due this week (presentation only). */
export function safeToSpend(remainingBudget: number | null, billsDueThisWeek: number): number | null {
  if (remainingBudget === null) return null
  return remainingBudget - billsDueThisWeek
}
