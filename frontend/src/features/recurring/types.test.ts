import { describe, expect, it } from 'vitest'
import { CADENCE_OPTIONS, cadenceLabel } from './types'

describe('recurring expense cadence labels', () => {
  it('uses user-friendly labels with clarifications where needed', () => {
    expect(CADENCE_OPTIONS).toEqual([
      { value: 'WEEKLY', label: 'Weekly' },
      { value: 'BIWEEKLY', label: 'Biweekly (every 2 weeks)' },
      { value: 'MONTHLY', label: 'Monthly' },
      { value: 'QUARTERLY', label: 'Quarterly (every 3 months)' },
      { value: 'SEMIANNUAL', label: 'Semiannual (every 6 months)' },
      { value: 'ANNUAL', label: 'Annual (once a year)' },
      { value: 'SEMIMONTHLY', label: 'Semimonthly (twice a month)' },
    ])
    expect(cadenceLabel('BIWEEKLY')).toBe('Biweekly (every 2 weeks)')
    expect(cadenceLabel('QUARTERLY')).toBe('Quarterly (every 3 months)')
    expect(cadenceLabel('SEMIANNUAL')).toBe('Semiannual (every 6 months)')
    expect(cadenceLabel('ANNUAL')).toBe('Annual (once a year)')
    expect(cadenceLabel('SEMIMONTHLY')).toBe('Semimonthly (twice a month)')
  })
})
