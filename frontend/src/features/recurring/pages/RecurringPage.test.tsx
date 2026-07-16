import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import * as categoryApi from '../../categories/api/categoryApi'
import * as recurringApi from '../api/recurringApi'
import { RecurringPage } from './RecurringPage'

vi.mock('../api/recurringApi', () => ({
  getRecurringExpenses: vi.fn(),
  getUpcomingRecurringExpenses: vi.fn(),
  getRecurringExpense: vi.fn(),
  createRecurringExpense: vi.fn(),
  updateRecurringExpense: vi.fn(),
  deleteRecurringExpense: vi.fn(),
  markRecurringExpensePaid: vi.fn(),
  previewRecurringExpenseOccurrences: vi.fn(),
  catchUpRecurringExpense: vi.fn(),
}))

vi.mock('../../categories/api/categoryApi', () => ({
  getCategories: vi.fn(),
}))

const sampleItem = {
  id: 10,
  description: 'Netflix',
  merchant: 'Netflix Inc',
  amount: 15.99,
  category: { id: 1, name: 'Entertainment' },
  cadence: 'MONTHLY' as const,
  nextPaymentDate: '2026-08-01',
  active: true,
  notes: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/recurring']}>
      <Routes>
        <Route path="/recurring" element={<RecurringPage />} />
        <Route path="/recurring/new" element={<p>Create form</p>} />
        <Route path="/recurring/:id/edit" element={<p>Edit form</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RecurringPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(categoryApi.getCategories).mockResolvedValue([
      { id: 1, name: 'Entertainment', description: null, createdAt: '', updatedAt: '' },
    ])
    vi.mocked(recurringApi.getRecurringExpenses).mockResolvedValue([sampleItem])
    vi.mocked(recurringApi.getUpcomingRecurringExpenses).mockResolvedValue([sampleItem])
  })

  it('loads recurring list and upcoming payments', async () => {
    renderPage()
    expect(screen.getByText('Loading recurring expenses…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Recurring' })).toBeInTheDocument()
    // Appears in both upcoming and list sections
    expect(screen.getAllByText('Netflix').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('heading', { name: /Upcoming payments/ })).toBeInTheDocument()
  })

  it('shows empty state', async () => {
    vi.mocked(recurringApi.getRecurringExpenses).mockResolvedValue([])
    vi.mocked(recurringApi.getUpcomingRecurringExpenses).mockResolvedValue([])
    renderPage()
    expect(await screen.findByText('No recurring expenses yet.')).toBeInTheDocument()
    expect(screen.getByText('No upcoming payments in the next 30 days.')).toBeInTheDocument()
  })

  it('shows Retry when API unavailable then recovers', async () => {
    const user = userEvent.setup()
    vi.mocked(recurringApi.getRecurringExpenses)
      .mockRejectedValueOnce(new ApiClientError({ message: 'down', code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce([sampleItem])
    vi.mocked(recurringApi.getUpcomingRecurringExpenses)
      .mockRejectedValueOnce(new ApiClientError({ message: 'down', code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce([sampleItem])

    renderPage()
    expect(await screen.findByText('Unable to load recurring expenses. Please try again.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect((await screen.findAllByText('Netflix')).length).toBeGreaterThanOrEqual(1)
  })

  it('marks paid after confirmation', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(recurringApi.markRecurringExpensePaid).mockResolvedValue({
      createdExpense: {
        id: 50,
        description: 'Netflix',
        amount: 15.99,
        expenseDate: '2026-08-01',
      },
      updatedRecurringExpense: {
        ...sampleItem,
        nextPaymentDate: '2026-09-01',
      },
    })

    renderPage()
    await screen.findAllByText('Netflix')
    await user.click(screen.getByRole('button', { name: 'Mark Paid' }))

    await waitFor(() => {
      expect(recurringApi.markRecurringExpensePaid).toHaveBeenCalledWith(10, {
        expectedNextPaymentDate: '2026-08-01',
      })
    })
    expect(await screen.findByText(/Paid "Netflix"/)).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it('records overdue occurrences via the catch-up panel', async () => {
    const user = userEvent.setup()
    const overdueItem = { ...sampleItem, id: 20, nextPaymentDate: '2020-01-01' }
    vi.mocked(recurringApi.getRecurringExpenses).mockResolvedValue([overdueItem])
    vi.mocked(recurringApi.getUpcomingRecurringExpenses).mockResolvedValue([])
    vi.mocked(recurringApi.previewRecurringExpenseOccurrences).mockResolvedValue({
      occurrences: [{ occurrenceDate: '2020-01-01', amount: 15.99 }],
      suggestedNextOnOrAfterToday: '2026-08-01',
    })
    vi.mocked(recurringApi.catchUpRecurringExpense).mockResolvedValue({
      createdCount: 1,
      createdDates: ['2020-01-01'],
      nextOccurrenceDate: '2026-08-01',
      updatedRecurringExpense: { ...overdueItem, nextPaymentDate: '2026-08-01' },
      createdExpenses: [],
    })

    renderPage()
    await screen.findAllByText('Netflix')
    await user.click(screen.getByRole('button', { name: 'Record past occurrences' }))

    await waitFor(() => {
      expect(recurringApi.previewRecurringExpenseOccurrences).toHaveBeenCalledWith(
        {
          cadence: 'MONTHLY',
          startDate: '2020-01-01',
          amount: 15.99,
          firstPaymentDay: undefined,
          secondPaymentDay: undefined,
        },
        expect.anything(),
      )
    })
    expect(await screen.findByText('01/01/2020')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Record 1 occurrence' }))

    await waitFor(() => {
      expect(recurringApi.catchUpRecurringExpense).toHaveBeenCalledWith(20, {
        occurrenceDates: ['2020-01-01'],
      })
    })
    expect(await screen.findByText(/Next scheduled date: 08\/01\/2026/)).toBeInTheDocument()
    expect(
      await screen.findByText('Recorded 1 past occurrence for "Netflix".'),
    ).toBeInTheDocument()
  })

  it('cancels delete when confirmation is dismissed', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPage()
    await screen.findAllByText('Netflix')
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(recurringApi.deleteRecurringExpense).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('handles mark-paid conflict by showing error and refreshing', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(recurringApi.markRecurringExpensePaid).mockRejectedValueOnce(
      new ApiClientError({
        message: 'Recurring expense was already updated; refresh and try again',
        code: 'RECURRING_EXPENSE_PAYMENT_CONFLICT',
        status: 409,
      }),
    )

    renderPage()
    await screen.findAllByText('Netflix')
    const callsBefore = vi.mocked(recurringApi.getRecurringExpenses).mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Mark Paid' }))

    expect(
      await screen.findByText('Recurring expense was already updated; refresh and try again'),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(vi.mocked(recurringApi.getRecurringExpenses).mock.calls.length).toBeGreaterThan(
        callsBefore,
      )
    })
    expect(recurringApi.markRecurringExpensePaid).toHaveBeenCalledWith(10, {
      expectedNextPaymentDate: '2026-08-01',
    })
    confirmSpy.mockRestore()
  })
})
