import { describe, expect, it } from 'vitest'
import { validateAmount, normalizeAmountInput, amountToRequestValue } from './amountUtils'

describe('amountUtils', () => {
  it('rejects blank amounts', () => {
    expect(validateAmount('   ')).toBe('Amount is required')
  })

  it('rejects zero amounts', () => {
    expect(validateAmount('0')).toBe('Amount must be greater than zero')
    expect(validateAmount('0.00')).toBe('Amount must be greater than zero')
  })

  it('rejects more than two decimal places', () => {
    expect(validateAmount('12.345')).toBe('Amount can have at most 2 decimal places')
  })

  it('rejects amounts that are too large', () => {
    expect(validateAmount('12345678901')).toBe(
      'Amount can have at most 10 digits before the decimal',
    )
  })

  it('accepts valid amounts', () => {
    expect(validateAmount('45.50')).toBeUndefined()
    expect(validateAmount('1,234.50')).toBeUndefined()
  })

  it('converts validated amounts for requests', () => {
    expect(normalizeAmountInput(' 1,234.50 ')).toBe('1234.50')
    expect(amountToRequestValue('1234.50')).toBe(1234.5)
  })
})
