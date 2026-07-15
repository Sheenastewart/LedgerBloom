/** Returns a positive safe integer, or null when the route id is invalid. */
export function parseCategoryRouteId(rawId: string | undefined): number | null {
  if (rawId === undefined || rawId.trim() === '') {
    return null
  }

  if (!/^\d+$/.test(rawId)) {
    return null
  }

  const value = Number(rawId)

  if (!Number.isInteger(value) || !Number.isSafeInteger(value) || value <= 0) {
    return null
  }

  return value
}
