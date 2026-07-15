import { describe, expect, it } from 'vitest'
import {
  amountToRequestValue,
  formatExpenseDate,
  normalizeAmountInput,
  validateAmount,
} from './amountUtils'

describe('amountUtils (re-export shim)', () => {
  it('rejects blank amounts', () => {
    expect(validateAmount('   ')).toBe('Amount is required')
  })

  it('converts validated amounts for requests', () => {
    expect(normalizeAmountInput(' 1,234.50 ')).toBe('1234.50')
    expect(amountToRequestValue('1234.50')).toBe(1234.5)
  })

  it('formats expense dates as MM/DD/YYYY', () => {
    expect(formatExpenseDate('2026-07-10')).toBe('07/10/2026')
  })
})
