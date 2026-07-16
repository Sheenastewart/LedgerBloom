export type LedgerFilterScope = 'all' | 'recorded' | 'upcoming' | 'schedules'

export function scopeIncludes(
  scope: LedgerFilterScope,
  target: Exclude<LedgerFilterScope, 'all'>,
): boolean {
  return scope === 'all' || scope === target
}

export function isLedgerFilterActive(filters: {
  scope?: LedgerFilterScope
  year?: number
  month?: number
  categoryId?: number
  source?: string
}): boolean {
  return (
    (filters.scope != null && filters.scope !== 'all') ||
    filters.year !== undefined ||
    filters.month !== undefined ||
    filters.categoryId !== undefined ||
    Boolean(filters.source?.trim())
  )
}
