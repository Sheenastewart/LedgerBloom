import { describe, expect, it } from 'vitest'
import { parseRecurringRouteId } from './parseRecurringRouteId'

describe('parseRecurringRouteId', () => {
  it('parses positive integer ids', () => {
    expect(parseRecurringRouteId('12')).toBe(12)
  })

  it('rejects invalid ids', () => {
    expect(parseRecurringRouteId(undefined)).toBeNull()
    expect(parseRecurringRouteId('abc')).toBeNull()
    expect(parseRecurringRouteId('0')).toBeNull()
  })
})
