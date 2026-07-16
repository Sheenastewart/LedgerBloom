import { describe, expect, it } from 'vitest'
import { expenseDisplayParts, expenseDisplayTitle, isOtherCategoryName } from './expenseDisplay'

describe('expenseDisplayParts', () => {
  it('uses merchant as the primary title when present', () => {
    expect(
      expenseDisplayParts({
        merchant: 'Netflix',
        description: 'Chase Sapphire',
        categoryName: 'Subscriptions',
      }),
    ).toEqual({
      title: 'Netflix',
      categoryName: 'Subscriptions',
      paymentSource: 'Chase Sapphire',
    })
  })

  it('falls back to category and still shows payment source', () => {
    expect(
      expenseDisplayParts({
        merchant: null,
        description: 'Checking',
        categoryName: 'Child Care',
      }),
    ).toEqual({
      title: 'Child Care',
      categoryName: null,
      paymentSource: 'Checking',
    })

    expect(
      expenseDisplayParts({
        merchant: '   ',
        description: null,
        categoryName: 'Groceries',
      }),
    ).toEqual({
      title: 'Groceries',
      categoryName: null,
      paymentSource: null,
    })
  })

  it('omits payment source when it matches the merchant', () => {
    expect(
      expenseDisplayParts({
        merchant: 'Netflix',
        description: 'Netflix',
        categoryName: 'Subscriptions',
      }),
    ).toEqual({
      title: 'Netflix',
      categoryName: 'Subscriptions',
      paymentSource: null,
    })
  })
})

describe('expenseDisplayTitle', () => {
  it('prefers merchant over category', () => {
    expect(
      expenseDisplayTitle({
        merchant: 'Market',
        description: 'Debit card',
        categoryName: 'Groceries',
      }),
    ).toBe('Market')
  })

  it('falls back to category when merchant is blank', () => {
    expect(
      expenseDisplayTitle({
        merchant: null,
        description: 'Debit card',
        categoryName: 'Child Care',
      }),
    ).toBe('Child Care')
    expect(
      expenseDisplayTitle({
        merchant: null,
        description: '   ',
        categoryName: 'Child Care',
      }),
    ).toBe('Child Care')
  })
})

describe('isOtherCategoryName', () => {
  it('matches Other case-insensitively', () => {
    expect(isOtherCategoryName('Other')).toBe(true)
    expect(isOtherCategoryName('other')).toBe(true)
    expect(isOtherCategoryName(' Child Care ')).toBe(false)
  })
})
