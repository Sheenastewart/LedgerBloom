export type DueDateStatus = {
  label: string
  className: string
}

export function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** ISO (YYYY-MM-DD) date strings compare lexicographically, so a plain string comparison is safe. */
export function isPastDate(dateIso: string, referenceTodayIso: string = todayIso()): boolean {
  return dateIso.trim().length > 0 && dateIso < referenceTodayIso
}

export function daysUntil(dateIso: string, todayIso: string): number {
  const target = new Date(`${dateIso}T00:00:00`)
  const today = new Date(`${todayIso}T00:00:00`)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function dueDateStatus(delta: number): DueDateStatus {
  if (delta < 0) {
    return { label: 'Overdue', className: 'overdue' }
  }
  if (delta === 0) {
    return { label: 'Due today', className: 'due-today' }
  }
  if (delta <= 7) {
    return { label: 'Due soon', className: 'due-soon' }
  }
  return { label: 'Upcoming', className: 'upcoming' }
}
