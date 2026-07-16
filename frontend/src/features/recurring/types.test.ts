import { describe, expect, it } from 'vitest'
import { CADENCE_OPTIONS, cadenceLabel } from './types'

describe('recurring expense cadence labels', () => {
  it('uses user-friendly labels for every supported frequency, including Semimonthly', () => {
    expect(CADENCE_OPTIONS).toEqual([
      { value: 'WEEKLY', label: 'Weekly' },
      { value: 'BIWEEKLY', label: 'Biweekly' },
      { value: 'MONTHLY', label: 'Monthly' },
      { value: 'QUARTERLY', label: 'Quarterly' },
      { value: 'SEMIANNUAL', label: 'Semiannual' },
      { value: 'ANNUAL', label: 'Annual' },
      { value: 'SEMIMONTHLY', label: 'Semimonthly' },
    ])
    expect(cadenceLabel('BIWEEKLY')).toBe('Biweekly')
    expect(cadenceLabel('SEMIMONTHLY')).toBe('Semimonthly')
  })
})
