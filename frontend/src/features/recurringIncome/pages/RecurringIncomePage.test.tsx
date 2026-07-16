import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecurringIncomePage } from './RecurringIncomePage'
import { IncomePage } from '../../income/pages/IncomePage'

vi.mock('../../income/api/incomeApi', () => ({
  getIncomeEntries: vi.fn().mockResolvedValue([]),
  deleteIncomeEntry: vi.fn(),
}))

vi.mock('../api/recurringIncomeApi', () => ({
  getRecurringIncome: vi.fn().mockResolvedValue([]),
  getUpcomingRecurringIncome: vi.fn().mockResolvedValue([]),
  deleteRecurringIncome: vi.fn(),
  markRecurringIncomeReceived: vi.fn(),
  previewRecurringIncomeOccurrences: vi.fn(),
  catchUpRecurringIncome: vi.fn(),
}))

describe('RecurringIncomePage', () => {
  afterEach(() => {
    cleanup()
  })

  it('redirects legacy route into the Income recurring section', async () => {
    render(
      <MemoryRouter initialEntries={['/recurring-income']}>
        <Routes>
          <Route path="/recurring-income" element={<RecurringIncomePage />} />
          <Route path="/income" element={<IncomePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Income' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Recurring schedules' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
