import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import * as incomeApi from '../api/incomeApi'
import * as recurringIncomeApi from '../../recurringIncome/api/recurringIncomeApi'
import { IncomePage } from './IncomePage'

vi.mock('../api/incomeApi', () => ({
  getIncomeEntries: vi.fn(),
  deleteIncomeEntry: vi.fn(),
  undoReceivedIncomeEntry: vi.fn(),
}))

vi.mock('../../recurringIncome/api/recurringIncomeApi', () => ({
  getRecurringIncome: vi.fn(),
  getUpcomingRecurringIncome: vi.fn(),
  deleteRecurringIncome: vi.fn(),
  markRecurringIncomeReceived: vi.fn(),
  previewRecurringIncomeOccurrences: vi.fn(),
  catchUpRecurringIncome: vi.fn(),
}))

const sampleEntries = [
  {
    id: 1,
    description: 'Monthly paycheck',
    source: 'Employer',
    amount: 4500.5,
    incomeDate: '2026-07-10',
    notes: 'july',
    createdAt: '2026-07-15T20:04:25.859404Z',
    updatedAt: '2026-07-15T20:04:25.859404Z',
    recurringIncomeId: null,
    canUndoReceived: null,
  },
  {
    id: 2,
    description: 'Salary',
    source: 'Employer',
    amount: 5000,
    incomeDate: '2026-07-15',
    notes: 'Received from recurring income #10',
    createdAt: '2026-07-15T20:04:25.859404Z',
    updatedAt: '2026-07-15T20:04:25.859404Z',
    recurringIncomeId: 10,
    canUndoReceived: true,
  },
]

const sampleRecurring = {
  id: 10,
  description: 'Weekly stipend',
  source: 'Side gig',
  amount: 100,
  cadence: 'WEEKLY' as const,
  nextIncomeDate: '2026-07-01',
  active: true,
  notes: null,
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
}

function renderPage(initialEntry = '/transactions/income') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/transactions/income" element={<IncomePage />} />
        <Route path="/transactions/income/add" element={<p>Add choice</p>} />
        <Route path="/transactions/recurring-income/new" element={<p>Recurring form</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('IncomePage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(incomeApi.getIncomeEntries).mockReset()
    vi.mocked(incomeApi.deleteIncomeEntry).mockReset()
    vi.mocked(incomeApi.undoReceivedIncomeEntry).mockReset()
    vi.mocked(recurringIncomeApi.getRecurringIncome).mockResolvedValue([])
    vi.mocked(recurringIncomeApi.getUpcomingRecurringIncome).mockResolvedValue([])
  })

  it('renders received income and links to add income', async () => {
    vi.mocked(incomeApi.getIncomeEntries).mockResolvedValue(sampleEntries)
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Monthly paycheck' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add income' })).toHaveAttribute(
      'href',
      '/transactions/income/add',
    )
  })

  it('redirects section=recurring to the recurring income hub', async () => {
    vi.mocked(recurringIncomeApi.getRecurringIncome).mockResolvedValue([sampleRecurring])
    vi.mocked(recurringIncomeApi.getUpcomingRecurringIncome).mockResolvedValue([])
    render(
      <MemoryRouter initialEntries={['/transactions/income?section=recurring']}>
        <Routes>
          <Route path="/transactions/income" element={<IncomePage />} />
          <Route
            path="/transactions/recurring-income"
            element={<p>Recurring income hub</p>}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Recurring income hub')).toBeInTheDocument()
  })

  it('shows empty received state with add income action', async () => {
    vi.mocked(incomeApi.getIncomeEntries).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('No received income yet.')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Add income' }).length).toBeGreaterThan(0)
  })

  it('retries received income safely after failure', async () => {
    const user = userEvent.setup()
    vi.mocked(incomeApi.getIncomeEntries)
      .mockRejectedValueOnce(
        new ApiClientError({ message: 'Unavailable', code: 'SERVICE_UNAVAILABLE', status: 503 }),
      )
      .mockResolvedValueOnce(sampleEntries)

    renderPage()
    expect(await screen.findByText('Unable to load income entries. Please try again.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: 'Monthly paycheck' })).toBeInTheDocument()
  })

  it('shows success banner from navigation state', async () => {
    vi.mocked(incomeApi.getIncomeEntries).mockResolvedValue(sampleEntries)
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/transactions/income',
            state: { successMessage: 'Saved income entry "Bonus".' },
          },
        ]}
      >
        <Routes>
          <Route path="/transactions/income" element={<IncomePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Saved income entry "Bonus".')).toBeInTheDocument()
    await waitFor(() => {
      expect(incomeApi.getIncomeEntries).toHaveBeenCalled()
    })
  })

  it('shows undo receive only for recurring-linked entries', async () => {
    vi.mocked(incomeApi.getIncomeEntries).mockResolvedValue(sampleEntries)
    renderPage()

    await screen.findByRole('heading', { name: 'Salary' })
    expect(screen.getByRole('button', { name: 'Undo receive' })).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: 'Undo receive' })).toHaveLength(1)
  })

  it('undoes a recurring receive after confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(incomeApi.getIncomeEntries).mockResolvedValue(sampleEntries)
    vi.mocked(incomeApi.undoReceivedIncomeEntry).mockResolvedValue({
      removedIncomeEntryId: 2,
      occurrenceDate: '2026-07-15',
      scheduleRestored: true,
      nextIncomeDate: '2026-07-15',
      recurringIncomeId: 10,
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()

    await screen.findByRole('heading', { name: 'Salary' })
    await user.click(screen.getByRole('button', { name: 'Undo receive' }))

    await waitFor(() => {
      expect(incomeApi.undoReceivedIncomeEntry).toHaveBeenCalledWith(2)
    })
    expect(await screen.findByRole('status')).toHaveTextContent(/Undid receiving "Salary"/i)
  })
})
