export type IncomeDisplayInput = {
  description: string
  source?: string | null
}

export type IncomeDisplayParts = {
  /** Primary label — always the income description. */
  title: string
  /** Where the money came from (employer, bank, account). */
  source: string | null
}

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/** Structured labels for income and recurring income rows. */
export function incomeDisplayParts(input: IncomeDisplayInput): IncomeDisplayParts {
  const title = input.description.trim() || 'Income'
  const source = trimOrNull(input.source)
  return {
    title,
    source: source && source !== title ? source : null,
  }
}

/** Primary display title for an income entry or recurring income schedule. */
export function incomeDisplayTitle(input: IncomeDisplayInput): string {
  return incomeDisplayParts(input).title
}

/** Secondary “where from” line, matching expense “Paid from …”. */
export function incomeSourceLabel(source: string | null | undefined): string | null {
  const trimmed = trimOrNull(source)
  return trimmed ? `From ${trimmed}` : null
}
