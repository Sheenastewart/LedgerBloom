import { describe, expect, it } from 'vitest'
import {
  CATEGORY_COLOR_PALETTE,
  resolveCategoryColor,
  softColorFromHex,
} from './categoryColor'

describe('categoryColor', () => {
  it('uses a stored hex color when present', () => {
    expect(resolveCategoryColor('Groceries', '#c45c3e')).toBe('#C45C3E')
  })

  it('falls back to a stable palette color from the name', () => {
    const a = resolveCategoryColor('Groceries', null)
    const b = resolveCategoryColor('Groceries', '')
    expect(a).toBe(b)
    expect(CATEGORY_COLOR_PALETTE.some((option) => option.hex === a)).toBe(true)
  })

  it('builds a soft background from a hex color', () => {
    expect(softColorFromHex('#C45C3E')).toMatch(/^rgb\(/)
  })
})
