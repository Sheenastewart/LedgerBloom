import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExpenseFilters, validateExpenseFilterDraft } from './ExpenseFilters'

describe('validateExpenseFilterDraft', () => {
  it('requires month and year together', () => {
    const result = validateExpenseFilterDraft({
      scope: 'all',
      month: '7',
      year: '',
      categoryId: '',
    })
    expect(result.errors.form).toMatch(/both month and year/i)
    expect(result.filters).toBeNull()
  })

  it('accepts month and year together', () => {
    const result = validateExpenseFilterDraft({
      scope: 'all',
      month: '7',
      year: '2026',
      categoryId: '',
    })
    expect(result.errors).toEqual({})
    expect(result.filters).toEqual({ scope: 'all', year: 2026, month: 7 })
  })

  it('accepts category-only filters', () => {
    const result = validateExpenseFilterDraft({
      scope: 'recorded',
      month: '',
      year: '',
      categoryId: '3',
    })
    expect(result.errors).toEqual({})
    expect(result.filters).toEqual({ scope: 'recorded', categoryId: 3 })
  })

  it('accepts combined filters', () => {
    const result = validateExpenseFilterDraft({
      scope: 'all',
      month: '6',
      year: '2026',
      categoryId: '2',
    })
    expect(result.filters).toEqual({ scope: 'all', year: 2026, month: 6, categoryId: 2 })
  })

  it('rejects invalid month values', () => {
    const result = validateExpenseFilterDraft({
      scope: 'all',
      month: '13',
      year: '2026',
      categoryId: '',
    })
    expect(result.errors.month).toMatch(/between 1 and 12/i)
  })
})

describe('ExpenseFilters', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('emits validated filters on apply', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const onClear = vi.fn()

    render(
      <ExpenseFilters
        categories={[{ id: 1, name: 'Groceries', description: null, color: null, createdAt: '', updatedAt: '' }]}
        appliedFilters={{ scope: 'all' }}
        onApply={onApply}
        onClear={onClear}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Month'), 'July')
    await user.type(screen.getByLabelText('Year'), '2026')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onApply).toHaveBeenCalledWith({ scope: 'all', year: 2026, month: 7 })
  })

  it('shows month names while submitting numeric month values', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()

    render(
      <ExpenseFilters
        categories={[]}
        appliedFilters={{ scope: 'all' }}
        onApply={onApply}
        onClear={vi.fn()}
      />,
    )

    const monthSelect = screen.getByLabelText('Month')
    expect(screen.getByRole('option', { name: 'January' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'December' })).toBeInTheDocument()

    await user.selectOptions(monthSelect, 'March')
    await user.type(screen.getByLabelText('Year'), '2026')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onApply).toHaveBeenCalledWith({ scope: 'all', year: 2026, month: 3 })
    expect((monthSelect as HTMLSelectElement).value).toBe('3')
  })

  it('clears filters', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const onClear = vi.fn()

    render(
      <ExpenseFilters
        categories={[]}
        appliedFilters={{ scope: 'all', year: 2026, month: 7 }}
        onApply={onApply}
        onClear={onClear}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onClear).toHaveBeenCalled()
  })
})
