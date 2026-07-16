import { describe, expect, it } from 'vitest'
import { incomeDisplayParts, incomeDisplayTitle, incomeSourceLabel } from './incomeDisplay'

describe('incomeDisplay', () => {
  it('uses description as the title and source as the origin', () => {
    expect(
      incomeDisplayParts({ description: 'Paycheck', source: 'Direct deposit' }),
    ).toEqual({
      title: 'Paycheck',
      source: 'Direct deposit',
    })
    expect(incomeDisplayTitle({ description: 'Bonus', source: 'Employer' })).toBe('Bonus')
    expect(incomeSourceLabel('Employer')).toBe('From Employer')
  })

  it('falls back when description is blank', () => {
    expect(incomeDisplayParts({ description: '  ', source: 'Job' })).toEqual({
      title: 'Income',
      source: 'Job',
    })
  })
})
