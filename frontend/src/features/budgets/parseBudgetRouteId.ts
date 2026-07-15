export function parseBudgetRouteId(raw: string | undefined): number | null {
  if (raw === undefined) {
    return null
  }
  if (!/^\d+$/.test(raw)) {
    return null
  }
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    return null
  }
  return value
}
