import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { IncomeAddChoicePage } from './IncomeAddChoicePage'

describe('IncomeAddChoicePage', () => {
  afterEach(() => {
    cleanup()
  })

  it('asks whether income is recurring and routes to both flows', () => {
    render(
      <MemoryRouter initialEntries={['/income/add']}>
        <Routes>
          <Route path="/income/add" element={<IncomeAddChoicePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Add income' })).toBeInTheDocument()
    expect(screen.getByText('Is this recurring?')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'One-time' })).toHaveAttribute('href', '/income/new')
    expect(screen.getByRole('link', { name: 'Recurring schedule' })).toHaveAttribute(
      'href',
      '/recurring-income/new',
    )
  })
})
