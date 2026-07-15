import { describe, expect, it } from 'vitest'
import { parseCategoryRouteId } from './parseCategoryRouteId'

describe('parseCategoryRouteId', () => {
  it('accepts positive safe integers', () => {
    expect(parseCategoryRouteId('1')).toBe(1)
    expect(parseCategoryRouteId('42')).toBe(42)
    expect(parseCategoryRouteId(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('rejects missing, zero, negative, decimal, and non-numeric values', () => {
    expect(parseCategoryRouteId(undefined)).toBeNull()
    expect(parseCategoryRouteId('')).toBeNull()
    expect(parseCategoryRouteId('   ')).toBeNull()
    expect(parseCategoryRouteId('0')).toBeNull()
    expect(parseCategoryRouteId('-1')).toBeNull()
    expect(parseCategoryRouteId('1.5')).toBeNull()
    expect(parseCategoryRouteId('abc')).toBeNull()
    expect(parseCategoryRouteId('12abc')).toBeNull()
    expect(parseCategoryRouteId('1e2')).toBeNull()
  })

  it('rejects values outside the safe integer range', () => {
    expect(parseCategoryRouteId('9007199254740992')).toBeNull()
  })
})
