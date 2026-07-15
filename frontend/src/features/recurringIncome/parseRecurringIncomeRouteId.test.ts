import { describe, expect, it } from 'vitest'
import { parseRecurringIncomeRouteId } from './parseRecurringIncomeRouteId'

describe('parseRecurringIncomeRouteId', () => {
  it('parses positive integer ids', () => {
    expect(parseRecurringIncomeRouteId('12')).toBe(12)
  })

  it('rejects invalid ids', () => {
    expect(parseRecurringIncomeRouteId(undefined)).toBeNull()
    expect(parseRecurringIncomeRouteId('abc')).toBeNull()
    expect(parseRecurringIncomeRouteId('0')).toBeNull()
  })
})
