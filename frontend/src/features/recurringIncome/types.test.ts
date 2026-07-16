import { describe, expect, it } from 'vitest'
import { CADENCE_OPTIONS, cadenceLabel } from './types'

describe('recurring income cadence labels', () => {
  it('uses user-friendly labels for every supported frequency', () => {
    expect(CADENCE_OPTIONS).toEqual([
      { value: 'WEEKLY', label: 'Weekly' },
      { value: 'BIWEEKLY', label: 'Biweekly' },
      { value: 'MONTHLY', label: 'Monthly' },
      { value: 'QUARTERLY', label: 'Quarterly' },
      { value: 'SEMIANNUAL', label: 'Semiannual' },
      { value: 'ANNUAL', label: 'Annual' },
    ])
    expect(cadenceLabel('BIWEEKLY')).toBe('Biweekly')
    expect(cadenceLabel('SEMIANNUAL')).toBe('Semiannual')
  })
})
