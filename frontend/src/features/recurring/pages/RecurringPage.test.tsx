import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import * as categoryApi from '../../categories/api/categoryApi'
import * as recurringApi from '../api/recurringApi'
import { RecurringExpensesPanel } from '../components/RecurringExpensesPanel'

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

function renderPanel() {
  return render(
    <MemoryRouter>
      <RecurringExpensesPanel />
    </MemoryRouter>,
  )
}

describe('RecurringExpensesPanel', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(categoryApi.getCategories).mockResolvedValue([
      { id: 1, name: 'Entertainment', description: null, color: null, createdAt: '', updatedAt: '' },
    ])
    vi.mocked(recurringApi.getRecurringExpenses).mockResolvedValue([sampleItem])
    vi.mocked(recurringApi.getUpcomingRecurringExpenses).mockResolvedValue([sampleItem])
  })

  it('loads recurring list and upcoming payments', async () => {
    renderPanel()
    expect(screen.getByText('Loading recurring expenses…')).toBeInTheDocument()
    expect(await screen.findByText('Remaining expenses')).toBeInTheDocument()
    expect(screen.getAllByText('Netflix Inc').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Next month's bills")).toBeInTheDocument()
    expect(screen.getByText('Preview')).toBeInTheDocument()
    // Next-month-only bills do not inflate the Remaining expenses total.
    const remainingSummary = screen.getByText('Remaining expenses').closest('summary')
    expect(remainingSummary).toHaveTextContent('0 payments')
    expect(remainingSummary).not.toHaveTextContent('$15.99')
  })

  it('shows empty state', async () => {
    vi.mocked(recurringApi.getRecurringExpenses).mockResolvedValue([])
    vi.mocked(recurringApi.getUpcomingRecurringExpenses).mockResolvedValue([])
    renderPanel()
    expect(await screen.findByText('No recurring expenses yet.')).toBeInTheDocument()
    expect(screen.getByText('No remaining bills this month or next month.')).toBeInTheDocument()
  })

  it('shows Retry when API unavailable then recovers', async () => {
    const user = userEvent.setup()
    vi.mocked(recurringApi.getRecurringExpenses)
      .mockRejectedValueOnce(new ApiClientError({ message: 'down', code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce([sampleItem])
    vi.mocked(recurringApi.getUpcomingRecurringExpenses)
      .mockRejectedValueOnce(new ApiClientError({ message: 'down', code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce([sampleItem])

    renderPanel()
    expect(await screen.findByText('Unable to load recurring expenses. Please try again.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect((await screen.findAllByText('Netflix Inc')).length).toBeGreaterThanOrEqual(1)
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

    renderPanel()
    await screen.findAllByText('Netflix Inc')
    await user.click(screen.getByRole('button', { name: 'Actions for Netflix Inc' }))
    await user.click(screen.getByRole('menuitem', { name: 'Mark Paid' }))

    await waitFor(() => {
      expect(recurringApi.markRecurringExpensePaid).toHaveBeenCalledWith(10, {
        expectedNextPaymentDate: '2026-08-01',
      })
    })
    expect(await screen.findByText(/Paid "Netflix Inc"/)).toBeInTheDocument()
    confirmSpy.mockRestore()
  })
})
