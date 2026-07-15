import { describe, expect, it } from 'vitest'
import {
  amountToRequestValue,
  formatAmountForInput,
  formatCurrency,
  formatIsoDate,
  normalizeAmountInput,
  validateAmount,
} from './moneyUtils'

describe('moneyUtils', () => {
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

  it('formats amounts for form inputs', () => {
    expect(formatAmountForInput(45.5)).toBe('45.5')
  })

  it('formats currency', () => {
    expect(formatCurrency(45.5)).toBe('$45.50')
  })

  it('formats ISO dates as MM/DD/YYYY', () => {
    expect(formatIsoDate('2026-07-10')).toBe('07/10/2026')
    expect(formatIsoDate('invalid')).toBe('invalid')
  })
})
