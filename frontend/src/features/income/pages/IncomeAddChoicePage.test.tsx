import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { IncomeAddChoicePage } from './IncomeAddChoicePage'

describe('IncomeAddChoicePage', () => {
  afterEach(() => {
    cleanup()
  })

  it('offers one-time and recurring income paths with clear labels', () => {
    render(
      <MemoryRouter initialEntries={['/income/add']}>
        <Routes>
          <Route path="/income/add" element={<IncomeAddChoicePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Add income' })).toBeInTheDocument()
    expect(screen.getByText('What kind of income are you adding?')).toBeInTheDocument()

    const oneTime = screen.getByRole('link', { name: 'One-time income' })
    expect(oneTime).toHaveAttribute('href', '/income/new')
    expect(
      screen.getByText(
        'Record money you received once, such as a refund, bonus, or one-time payment.',
      ),
    ).toBeInTheDocument()

    const recurring = screen.getByRole('link', { name: 'Recurring income' })
    expect(recurring).toHaveAttribute('href', '/recurring-income/new')
    expect(
      screen.getByText(
        'Set up income received on a repeating schedule, such as weekly, biweekly, or monthly pay.',
      ),
    ).toBeInTheDocument()
  })
})
