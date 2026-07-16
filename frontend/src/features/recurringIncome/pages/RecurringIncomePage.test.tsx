import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecurringIncomePage } from './RecurringIncomePage'

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

  it('renders the recurring income schedules panel', async () => {
    render(
      <MemoryRouter initialEntries={['/transactions/recurring-income']}>
        <Routes>
          <Route path="/transactions/recurring-income" element={<RecurringIncomePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Recurring schedules' })).toBeInTheDocument()
    expect(screen.getByText('No recurring income schedules yet.')).toBeInTheDocument()
  })
})
