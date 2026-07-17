import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IncomeFilters, validateIncomeFilterDraft } from './IncomeFilters'

describe('validateIncomeFilterDraft', () => {
  it('requires month and year together', () => {
    const result = validateIncomeFilterDraft({ scope: 'all', month: '7', year: '', source: '' })
    expect(result.errors.form).toMatch(/both month and year/i)
    expect(result.filters).toBeNull()
  })

  it('accepts month and year together', () => {
    const result = validateIncomeFilterDraft({
      scope: 'all',
      month: '7',
      year: '2026',
      source: '',
    })
    expect(result.errors).toEqual({})
    expect(result.filters).toEqual({ scope: 'all', year: 2026, month: 7 })
  })

  it('accepts source-only filters', () => {
    const result = validateIncomeFilterDraft({
      scope: 'recorded',
      month: '',
      year: '',
      source: 'Employer',
    })
    expect(result.errors).toEqual({})
    expect(result.filters).toEqual({ scope: 'recorded', source: 'Employer' })
  })

  it('trims source values', () => {
    const result = validateIncomeFilterDraft({
      scope: 'all',
      month: '',
      year: '',
      source: '  Employer  ',
    })
    expect(result.filters).toEqual({ scope: 'all', source: 'Employer' })
  })

  it('accepts combined filters', () => {
    const result = validateIncomeFilterDraft({
      scope: 'all',
      month: '6',
      year: '2026',
      source: 'Freelance',
    })
    expect(result.filters).toEqual({
      scope: 'all',
      year: 2026,
      month: 6,
      source: 'Freelance',
    })
  })

  it('rejects invalid month values', () => {
    const result = validateIncomeFilterDraft({
      scope: 'all',
      month: '13',
      year: '2026',
      source: '',
    })
    expect(result.errors.month).toMatch(/between 1 and 12/i)
  })
})

describe('IncomeFilters', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('emits validated filters on apply', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const onClear = vi.fn()

    render(
      <IncomeFilters
        appliedFilters={{ scope: 'all' }}
        onApply={onApply}
        onClear={onClear}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Month'), 'July')
    await user.selectOptions(screen.getByLabelText('Year'), '2026')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onApply).toHaveBeenCalledWith({ scope: 'all', year: 2026, month: 7 })
  })

  it('shows month names while submitting numeric month values', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()

    render(
      <IncomeFilters appliedFilters={{ scope: 'all' }} onApply={onApply} onClear={vi.fn()} />,
    )

    const monthSelect = screen.getByLabelText('Month')
    expect(screen.getByRole('option', { name: 'January' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'December' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '1992' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '2035' })).toBeInTheDocument()

    await user.selectOptions(monthSelect, 'March')
    await user.selectOptions(screen.getByLabelText('Year'), '2026')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onApply).toHaveBeenCalledWith({ scope: 'all', year: 2026, month: 3 })
    expect((monthSelect as HTMLSelectElement).value).toBe('3')
  })

  it('defaults month and year to the current period', () => {
    const now = new Date()
    render(
      <IncomeFilters appliedFilters={{ scope: 'all' }} onApply={vi.fn()} onClear={vi.fn()} />,
    )

    expect((screen.getByLabelText('Month') as HTMLSelectElement).value).toBe(
      String(now.getMonth() + 1),
    )
    expect((screen.getByLabelText('Year') as HTMLSelectElement).value).toBe(
      String(now.getFullYear()),
    )
  })

  it('applies a source text filter when month and year are cleared to Any', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()

    render(
      <IncomeFilters appliedFilters={{ scope: 'all' }} onApply={onApply} onClear={vi.fn()} />,
    )

    await user.selectOptions(screen.getByLabelText('Month'), 'Any month')
    await user.selectOptions(screen.getByLabelText('Year'), 'Any year')
    await user.type(screen.getByLabelText('Source'), 'Employer')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onApply).toHaveBeenCalledWith({ scope: 'all', source: 'Employer' })
  })

  it('clears filters', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const onClear = vi.fn()

    render(
      <IncomeFilters
        appliedFilters={{ scope: 'all', year: 2026, month: 7 }}
        onApply={onApply}
        onClear={onClear}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onClear).toHaveBeenCalled()
  })
})
