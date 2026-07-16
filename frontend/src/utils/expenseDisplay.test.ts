import { describe, expect, it } from 'vitest'
import { expenseDisplayTitle, isOtherCategoryName } from './expenseDisplay'

describe('expenseDisplayTitle', () => {
  it('prefers a non-blank description', () => {
    expect(expenseDisplayTitle('Daycare', 'Child Care')).toBe('Daycare')
  })

  it('falls back to the category name when description is blank', () => {
    expect(expenseDisplayTitle(null, 'Child Care')).toBe('Child Care')
    expect(expenseDisplayTitle('   ', 'Child Care')).toBe('Child Care')
  })
})

describe('isOtherCategoryName', () => {
  it('matches Other case-insensitively', () => {
    expect(isOtherCategoryName('Other')).toBe(true)
    expect(isOtherCategoryName('other')).toBe(true)
    expect(isOtherCategoryName(' Child Care ')).toBe(false)
  })
})
