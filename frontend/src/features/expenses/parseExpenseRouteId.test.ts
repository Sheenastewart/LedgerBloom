import { describe, expect, it } from 'vitest'
import { parseExpenseRouteId } from './parseExpenseRouteId'

describe('parseExpenseRouteId', () => {
  it('returns null for missing ids', () => {
    expect(parseExpenseRouteId(undefined)).toBeNull()
    expect(parseExpenseRouteId('')).toBeNull()
    expect(parseExpenseRouteId('   ')).toBeNull()
  })

  it('returns null for invalid ids', () => {
    expect(parseExpenseRouteId('abc')).toBeNull()
    expect(parseExpenseRouteId('0')).toBeNull()
    expect(parseExpenseRouteId('-1')).toBeNull()
    expect(parseExpenseRouteId('1.5')).toBeNull()
  })

  it('returns positive safe integers', () => {
    expect(parseExpenseRouteId('7')).toBe(7)
    expect(parseExpenseRouteId('42')).toBe(42)
  })
})
