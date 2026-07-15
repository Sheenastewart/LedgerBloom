import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import * as recurringIncomeApi from '../api/recurringIncomeApi'
import { RecurringIncomePage } from './RecurringIncomePage'

vi.mock('../api/recurringIncomeApi', () => ({
  getRecurringIncome: vi.fn(),
  getUpcomingRecurringIncome: vi.fn(),
  getRecurringIncomeById: vi.fn(),
  createRecurringIncome: vi.fn(),
  updateRecurringIncome: vi.fn(),
  deleteRecurringIncome: vi.fn(),
  markRecurringIncomeReceived: vi.fn(),
}))

const sampleItem = {
  id: 10,
  description: 'Paycheck',
  source: 'Employer',
  amount: 4500,
  cadence: 'BIWEEKLY' as const,
  nextIncomeDate: '2026-08-01',
  active: true,
  notes: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/recurring-income']}>
      <Routes>
        <Route path="/recurring-income" element={<RecurringIncomePage />} />
        <Route path="/recurring-income/new" element={<p>Create form</p>} />
        <Route path="/recurring-income/:id/edit" element={<p>Edit form</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RecurringIncomePage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(recurringIncomeApi.getRecurringIncome).mockResolvedValue([sampleItem])
    vi.mocked(recurringIncomeApi.getUpcomingRecurringIncome).mockResolvedValue([sampleItem])
  })

  it('loads recurring income list and upcoming income', async () => {
    renderPage()
    expect(screen.getByText('Loading recurring income…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Recurring Income' })).toBeInTheDocument()
    expect(screen.getAllByText('Paycheck').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('heading', { name: 'Upcoming income' })).toBeInTheDocument()
  })

  it('shows empty state', async () => {
    vi.mocked(recurringIncomeApi.getRecurringIncome).mockResolvedValue([])
    vi.mocked(recurringIncomeApi.getUpcomingRecurringIncome).mockResolvedValue([])
    renderPage()
    expect(await screen.findByText('No recurring income yet.')).toBeInTheDocument()
    expect(screen.getByText('No upcoming income in the next 30 days.')).toBeInTheDocument()
  })

  it('shows Retry when API unavailable then recovers', async () => {
    const user = userEvent.setup()
    vi.mocked(recurringIncomeApi.getRecurringIncome)
      .mockRejectedValueOnce(new ApiClientError({ message: 'down', code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce([sampleItem])
    vi.mocked(recurringIncomeApi.getUpcomingRecurringIncome)
      .mockRejectedValueOnce(new ApiClientError({ message: 'down', code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce([sampleItem])

    renderPage()
    expect(await screen.findByText('Unable to load recurring income. Please try again.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect((await screen.findAllByText('Paycheck')).length).toBeGreaterThanOrEqual(1)
  })

  it('marks received after confirmation', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(recurringIncomeApi.markRecurringIncomeReceived).mockResolvedValue({
      createdIncomeEntry: {
        id: 50,
        description: 'Paycheck',
        source: 'Employer',
        amount: 4500,
        incomeDate: '2026-08-01',
        notes: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      updatedRecurringIncome: {
        ...sampleItem,
        nextIncomeDate: '2026-08-15',
      },
    })

    renderPage()
    await screen.findAllByText('Paycheck')
    await user.click(screen.getByRole('button', { name: 'Mark Received' }))

    await waitFor(() => {
      expect(recurringIncomeApi.markRecurringIncomeReceived).toHaveBeenCalledWith(10, {
        expectedNextIncomeDate: '2026-08-01',
      })
    })
    expect(await screen.findByText(/Received "Paycheck"/)).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it('cancels delete when confirmation is dismissed', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPage()
    await screen.findAllByText('Paycheck')
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(recurringIncomeApi.deleteRecurringIncome).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('handles mark-received conflict by showing error and refreshing', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(recurringIncomeApi.markRecurringIncomeReceived).mockRejectedValueOnce(
      new ApiClientError({
        message: 'Recurring income was already updated; refresh and try again',
        code: 'RECURRING_INCOME_RECEIPT_CONFLICT',
        status: 409,
      }),
    )

    renderPage()
    await screen.findAllByText('Paycheck')
    const callsBefore = vi.mocked(recurringIncomeApi.getRecurringIncome).mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Mark Received' }))

    expect(
      await screen.findByText('Recurring income was already updated; refresh and try again'),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(vi.mocked(recurringIncomeApi.getRecurringIncome).mock.calls.length).toBeGreaterThan(
        callsBefore,
      )
    })
    expect(recurringIncomeApi.markRecurringIncomeReceived).toHaveBeenCalledWith(10, {
      expectedNextIncomeDate: '2026-08-01',
    })
    confirmSpy.mockRestore()
  })
})
