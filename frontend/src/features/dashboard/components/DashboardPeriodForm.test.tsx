import { describe, expect, it } from 'vitest'
import { validateDraft } from './DashboardPeriodForm'

describe('validateDraft', () => {
  it('requires both month and year', () => {
    expect(validateDraft({ month: '', year: '' }).errors.form).toBe(
      'Select both month and year.',
    )
    expect(validateDraft({ month: '7', year: '' }).period).toBeNull()
    expect(validateDraft({ month: '', year: '2026' }).period).toBeNull()
  })

  it('rejects invalid month and year', () => {
    expect(validateDraft({ month: '13', year: '2026' }).errors.month).toBeTruthy()
    expect(validateDraft({ month: '7', year: '0' }).errors.year).toBeTruthy()
  })

  it('accepts a valid period', () => {
    const result = validateDraft({ month: '7', year: '2026' })
    expect(result.errors).toEqual({})
    expect(result.period).toEqual({ month: 7, year: 2026 })
  })
})
