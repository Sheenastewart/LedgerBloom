import { describe, expect, it } from 'vitest'
import { parseBudgetRouteId } from './parseBudgetRouteId'

describe('parseBudgetRouteId', () => {
  it('parses positive integer ids', () => {
    expect(parseBudgetRouteId('12')).toBe(12)
  })

  it('rejects invalid ids', () => {
    expect(parseBudgetRouteId(undefined)).toBeNull()
    expect(parseBudgetRouteId('abc')).toBeNull()
    expect(parseBudgetRouteId('0')).toBeNull()
    expect(parseBudgetRouteId('-1')).toBeNull()
  })
})
