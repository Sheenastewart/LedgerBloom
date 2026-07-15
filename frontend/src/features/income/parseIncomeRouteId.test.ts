import { describe, expect, it } from 'vitest'
import { parseIncomeRouteId } from './parseIncomeRouteId'

describe('parseIncomeRouteId', () => {
  it('returns null for missing ids', () => {
    expect(parseIncomeRouteId(undefined)).toBeNull()
    expect(parseIncomeRouteId('')).toBeNull()
    expect(parseIncomeRouteId('   ')).toBeNull()
  })

  it('returns null for invalid ids', () => {
    expect(parseIncomeRouteId('abc')).toBeNull()
    expect(parseIncomeRouteId('0')).toBeNull()
    expect(parseIncomeRouteId('-1')).toBeNull()
    expect(parseIncomeRouteId('1.5')).toBeNull()
  })

  it('returns positive safe integers', () => {
    expect(parseIncomeRouteId('7')).toBe(7)
    expect(parseIncomeRouteId('42')).toBe(42)
  })
})
