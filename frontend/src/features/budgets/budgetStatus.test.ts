import { describe, expect, it } from 'vitest'
import { budgetStatus, budgetStatusLabel } from './budgetStatus'

describe('budgetStatus', () => {
  it('classifies on track, near budget, and over budget', () => {
    expect(budgetStatus(false, 50)).toBe('on-track')
    expect(budgetStatus(false, 80)).toBe('near-budget')
    expect(budgetStatus(false, 99.99)).toBe('near-budget')
    expect(budgetStatus(true, 120)).toBe('over-budget')
    expect(budgetStatusLabel('near-budget')).toBe('Near budget')
  })
})
