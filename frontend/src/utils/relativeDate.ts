/** Relative calendar-day labels from an ISO date (YYYY-MM-DD). */

export function relativeDateLabel(isoDate: string, todayIso = startOfTodayIso()): string {
  const diff = daysBetween(todayIso, isoDate)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1 && diff <= 6) return `In ${diff} days`
  if (diff < -1 && diff >= -6) return `${Math.abs(diff)} days ago`
  return formatShortDate(isoDate)
}

export function agendaGroupForDate(isoDate: string, todayIso = startOfTodayIso()): 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' {
  const diff = daysBetween(todayIso, isoDate)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff <= 7) return 'week'
  return 'later'
}

export function startOfTodayIso(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`)
  const to = new Date(`${toIso}T00:00:00`)
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

function formatShortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
