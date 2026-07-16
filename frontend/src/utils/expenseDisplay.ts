/** Display title for an expense or recurring expense row. */
export function expenseDisplayTitle(description: string | null | undefined, categoryName: string): string {
  const trimmed = description?.trim()
  if (trimmed) {
    return trimmed
  }
  return categoryName
}

export function isOtherCategoryName(name: string | null | undefined): boolean {
  return (name ?? '').trim().toLowerCase() === 'other'
}
