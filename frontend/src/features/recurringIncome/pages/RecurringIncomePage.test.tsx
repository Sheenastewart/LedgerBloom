import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { paths } from '../../../routes/paths'
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

  it('redirects the legacy list URL to the income page', async () => {
    render(
      <MemoryRouter initialEntries={['/transactions/recurring-income']}>
        <Routes>
          <Route path="/transactions/recurring-income" element={<RecurringIncomePage />} />
          <Route path={paths.transactionsIncome} element={<p>Income home</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Income home')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText('Recurring schedules')).not.toBeInTheDocument()
    })
  })
})
