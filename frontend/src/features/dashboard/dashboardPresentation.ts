/** Dashboard helpers that only reshape existing API values for presentation. */

export function greetingForNow(now = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function startOfTodayIso(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

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
}

export function mergeRecentActivity(
  expenses: Array<{
    id: number
    description: string
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
  }>,
  limit = 8,
): ActivityItem[] {
  const expenseItems: ActivityItem[] = expenses.map((item) => ({
    id: `expense-${item.id}`,
    kind: 'expense',
    description: item.description,
    amount: item.amount,
    date: item.expenseDate,
    detail: item.category.name,
  }))
  const incomeItems: ActivityItem[] = incomes.map((item) => ({
    id: `income-${item.id}`,
    kind: 'income',
    description: item.description,
    amount: item.amount,
    date: item.incomeDate,
    detail: item.source,
  }))
  return [...expenseItems, ...incomeItems]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id.localeCompare(b.id)))
    .slice(0, limit)
}
