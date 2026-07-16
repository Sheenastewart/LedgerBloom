import { describe, expect, it } from 'vitest'
import {
  displayRecurringAmount,
  isSubMonthlyCadence,
  perOccurrenceLabel,
} from './monthlyEquivalent'

describe('displayRecurringAmount', () => {
  it('scales weekly, biweekly, and semimonthly up to a monthly total', () => {
    expect(displayRecurringAmount(10, 'WEEKLY')).toBe(40)
    expect(displayRecurringAmount(10, 'BIWEEKLY')).toBe(20)
    expect(displayRecurringAmount(50, 'SEMIMONTHLY')).toBe(100)
  })

  it('leaves monthly and less-frequent charges exact', () => {
    expect(displayRecurringAmount(15.99, 'MONTHLY')).toBe(15.99)
    expect(displayRecurringAmount(300, 'QUARTERLY')).toBe(300)
    expect(displayRecurringAmount(600, 'SEMIANNUAL')).toBe(600)
    expect(displayRecurringAmount(1200, 'ANNUAL')).toBe(1200)
  })
})

describe('isSubMonthlyCadence', () => {
  it('flags only cadences that fire more than once a month', () => {
    expect(isSubMonthlyCadence('WEEKLY')).toBe(true)
    expect(isSubMonthlyCadence('BIWEEKLY')).toBe(true)
    expect(isSubMonthlyCadence('SEMIMONTHLY')).toBe(true)
    expect(isSubMonthlyCadence('MONTHLY')).toBe(false)
    expect(isSubMonthlyCadence('QUARTERLY')).toBe(false)
  })
})

describe('perOccurrenceLabel', () => {
  it('explains the real charge when the list shows a monthly total', () => {
    expect(perOccurrenceLabel(10, 'WEEKLY')).toBe('$10.00 each week')
    expect(perOccurrenceLabel(10, 'BIWEEKLY')).toBe('$10.00 every 2 weeks')
    expect(perOccurrenceLabel(50, 'SEMIMONTHLY')).toBe('$50.00 each')
    expect(perOccurrenceLabel(300, 'QUARTERLY')).toBeNull()
  })
})
