export type ExpenseDisplayInput = {
  merchant?: string | null
  /** Payment source (card/account) — stored as description in the API. */
  description?: string | null
  categoryName: string
}

export type ExpenseDisplayParts = {
  /** Primary label: merchant when present, otherwise category. */
  title: string
  /** Shown under the title when merchant is the title. */
  categoryName: string | null
  /** Payment source shown under category when present. */
  paymentSource: string | null
}

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** Structured labels for expense and recurring expense rows. */
export function expenseDisplayParts(input: ExpenseDisplayInput): ExpenseDisplayParts {
  const merchant = trimOrNull(input.merchant)
  const paymentSource = trimOrNull(input.description)
  const categoryName = input.categoryName.trim() || 'Expense'

  if (merchant) {
    return {
      title: merchant,
      categoryName,
      paymentSource: paymentSource && paymentSource !== merchant ? paymentSource : null,
    }
  }

  return {
    title: categoryName,
    categoryName: null,
    paymentSource,
  }
}

/** Primary display title for an expense or recurring expense. */
export function expenseDisplayTitle(input: ExpenseDisplayInput): string {
  return expenseDisplayParts(input).title
}

export function isOtherCategoryName(name: string | null | undefined): boolean {
  return (name ?? '').trim().toLowerCase() === 'other'
}
