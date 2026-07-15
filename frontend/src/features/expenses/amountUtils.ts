const AMOUNT_PATTERN = /^(\d{1,10})(\.\d{1,2})?$/

export function normalizeAmountInput(amount: string): string {
  return amount.replace(/,/g, '').trim()
}

export function validateAmount(amount: string): string | undefined {
  const normalized = normalizeAmountInput(amount)

  if (!normalized) {
    return 'Amount is required'
  }

  if (normalized.includes(',')) {
    return 'Amount cannot contain commas'
  }

  if (!AMOUNT_PATTERN.test(normalized)) {
    const integerPart = normalized.split('.')[0] ?? ''
    if (/^\d+\.\d{3,}$/.test(normalized)) {
      return 'Amount can have at most 2 decimal places'
    }
    if (integerPart.length > 10) {
      return 'Amount can have at most 10 digits before the decimal'
    }
    return 'Enter a valid amount'
  }

  if (!isAmountGreaterThanZero(normalized)) {
    return 'Amount must be greater than zero'
  }

  return undefined
}

function isAmountGreaterThanZero(normalized: string): boolean {
  const [integerPart = '0', fractionalPart = ''] = normalized.split('.')
  const integerValue = integerPart.replace(/^0+/, '') || '0'
  if (integerValue !== '0') {
    return true
  }
  return fractionalPart.split('').some((digit) => digit !== '0')
}

/** Converts a validated decimal string to a JSON number for the API payload. */
export function amountToRequestValue(normalizedAmount: string): number {
  return JSON.parse(normalizedAmount) as number
}

/** Converts an API amount to a form input string without floating-point math. */
export function formatAmountForInput(amount: number): string {
  const asString = String(amount)
  if (!asString.includes('e') && !asString.includes('E')) {
    return asString
  }
  return amount.toFixed(2)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatExpenseDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) {
    return isoDate
  }
  return `${month}/${day}/${year}`
}
