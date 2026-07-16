import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import * as categoryApi from '../../categories/api/categoryApi'
import * as expenseApi from '../api/expenseApi'
import { ExpensesPage } from './ExpensesPage'

vi.mock('../api/expenseApi', () => ({
  getExpenses: vi.fn(),
  deleteExpense: vi.fn(),
}))

vi.mock('../../categories/api/categoryApi', () => ({
  getCategories: vi.fn(),
}))

const sampleCategories = [
  {
    id: 1,
    name: 'Groceries',
    description: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Travel',
    description: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

const sampleExpenses = [
  {
    id: 1,
    description: 'Weekly shopping',
    merchant: 'Market',
    amount: 45.5,
    expenseDate: '2026-07-10',
    category: { id: 1, name: 'Groceries' },
    notes: 'july',
    createdAt: '2026-07-15T20:04:25.859404Z',
    updatedAt: '2026-07-15T20:04:25.859404Z',
  },
  {
    id: 2,
    description: 'Train ticket',
    merchant: null,
    amount: 18,
    expenseDate: '2026-06-02',
    category: { id: 2, name: 'Travel' },
    notes: null,
    createdAt: '2026-06-02T10:00:00Z',
    updatedAt: '2026-06-02T10:00:00Z',
  },
]

function renderPage(initialEntry = '/transactions/expenses') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/transactions/expenses" element={<ExpensesPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ExpensesPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(expenseApi.getExpenses).mockReset()
    vi.mocked(expenseApi.deleteExpense).mockReset()
    vi.mocked(categoryApi.getCategories).mockReset()
    vi.mocked(categoryApi.getCategories).mockResolvedValue(sampleCategories)
  })

  it('shows a loading state while expenses load', () => {
    vi.mocked(expenseApi.getExpenses).mockReturnValue(new Promise(() => undefined))
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Loading expenses…')
  })

  it('renders expenses from the API', async () => {
    vi.mocked(expenseApi.getExpenses).mockResolvedValue(sampleExpenses)
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Weekly shopping' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Train ticket' })).toBeInTheDocument()
    expect(screen.getByText('Merchant: Market')).toBeInTheDocument()
  })

  it('shows an empty state when there are no expenses', async () => {
    vi.mocked(expenseApi.getExpenses).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('No expenses yet.')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Add expense' }).length).toBeGreaterThan(0)
  })

  it('shows filter empty copy when filters are active and nothing matches', async () => {
    const user = userEvent.setup()
    vi.mocked(expenseApi.getExpenses)
      .mockResolvedValueOnce(sampleExpenses)
      .mockResolvedValueOnce([])

    renderPage()
    await screen.findByRole('heading', { name: 'Weekly shopping' })

    await user.selectOptions(screen.getByLabelText('Category'), '1')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByText('No expenses match the current filters.')).toBeInTheDocument()
  })

  it('shows an error state and retries', async () => {
    const user = userEvent.setup()
    vi.mocked(expenseApi.getExpenses)
      .mockRejectedValueOnce(new ApiClientError({ message: 'down', code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce(sampleExpenses)

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(/Unable to load expenses/i)
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: 'Weekly shopping' })).toBeInTheDocument()
    expect(expenseApi.getExpenses).toHaveBeenCalledTimes(2)
    expect(categoryApi.getCategories).toHaveBeenCalledTimes(2)
  })

  it('fails initial expense and category loads safely, then recovers both on Retry', async () => {
    const user = userEvent.setup()
    vi.mocked(categoryApi.getCategories)
      .mockRejectedValueOnce(new ApiClientError({ message: 'down', code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce(sampleCategories)
    vi.mocked(expenseApi.getExpenses)
      .mockRejectedValueOnce(new ApiClientError({ message: 'down', code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce(sampleExpenses)

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(/Unable to load expenses/i)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.getByLabelText('Category')).toHaveDisplayValue('Any category')
    expect(screen.queryByRole('option', { name: 'Groceries' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('heading', { name: 'Weekly shopping' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Groceries' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Travel' })).toBeInTheDocument()
    expect(categoryApi.getCategories).toHaveBeenCalledTimes(2)
    expect(expenseApi.getExpenses).toHaveBeenCalledTimes(2)

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(categoryApi.getCategories).toHaveBeenCalledTimes(2)
    expect(expenseApi.getExpenses).toHaveBeenCalledTimes(2)
  })

  it('preserves applied filters when Retry reloads categories and expenses', async () => {
    const user = userEvent.setup()
    vi.mocked(expenseApi.getExpenses)
      .mockResolvedValueOnce(sampleExpenses)
      .mockRejectedValueOnce(new ApiClientError({ message: 'down', code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce([sampleExpenses[0]])
    vi.mocked(categoryApi.getCategories)
      .mockResolvedValueOnce(sampleCategories)
      .mockResolvedValueOnce(sampleCategories)

    renderPage()
    await screen.findByRole('heading', { name: 'Weekly shopping' })

    await user.selectOptions(screen.getByLabelText('Category'), '1')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Unable to load expenses/i)
    expect(expenseApi.getExpenses).toHaveBeenLastCalledWith({ categoryId: 1 }, undefined)

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('heading', { name: 'Weekly shopping' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Groceries' })).toBeInTheDocument()
    expect(expenseApi.getExpenses).toHaveBeenLastCalledWith({ categoryId: 1 }, undefined)
    expect(categoryApi.getCategories).toHaveBeenCalledTimes(2)
    expect(expenseApi.getExpenses).toHaveBeenCalledTimes(3)
  })

  it('filters by month and year', async () => {
    const user = userEvent.setup()
    vi.mocked(expenseApi.getExpenses)
      .mockResolvedValueOnce(sampleExpenses)
      .mockResolvedValueOnce([sampleExpenses[0]])

    renderPage()
    await screen.findByRole('heading', { name: 'Weekly shopping' })

    await user.selectOptions(screen.getByLabelText('Month'), 'July')
    await user.clear(screen.getByLabelText('Year'))
    await user.type(screen.getByLabelText('Year'), '2026')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      expect(expenseApi.getExpenses).toHaveBeenLastCalledWith({ year: 2026, month: 7 }, undefined)
    })
  })

  it('filters by category', async () => {
    const user = userEvent.setup()
    vi.mocked(expenseApi.getExpenses)
      .mockResolvedValueOnce(sampleExpenses)
      .mockResolvedValueOnce([sampleExpenses[1]])

    renderPage()
    await screen.findByRole('heading', { name: 'Weekly shopping' })

    await user.selectOptions(screen.getByLabelText('Category'), '2')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      expect(expenseApi.getExpenses).toHaveBeenLastCalledWith({ categoryId: 2 }, undefined)
    })
  })

  it('filters by month and category together', async () => {
    const user = userEvent.setup()
    vi.mocked(expenseApi.getExpenses)
      .mockResolvedValueOnce(sampleExpenses)
      .mockResolvedValueOnce([sampleExpenses[0]])

    renderPage()
    await screen.findByRole('heading', { name: 'Weekly shopping' })

    await user.selectOptions(screen.getByLabelText('Month'), 'July')
    await user.clear(screen.getByLabelText('Year'))
    await user.type(screen.getByLabelText('Year'), '2026')
    await user.selectOptions(screen.getByLabelText('Category'), '1')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      expect(expenseApi.getExpenses).toHaveBeenLastCalledWith(
        {
          year: 2026,
          month: 7,
          categoryId: 1,
        },
        undefined,
      )
    })
  })

  it('clears filters', async () => {
    const user = userEvent.setup()
    vi.mocked(expenseApi.getExpenses)
      .mockResolvedValueOnce(sampleExpenses)
      .mockResolvedValueOnce([sampleExpenses[0]])
      .mockResolvedValueOnce(sampleExpenses)

    renderPage()
    await screen.findByRole('heading', { name: 'Weekly shopping' })

    await user.selectOptions(screen.getByLabelText('Category'), '1')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    await user.click(screen.getByRole('button', { name: 'Clear' }))

    await waitFor(() => {
      expect(expenseApi.getExpenses).toHaveBeenLastCalledWith({}, undefined)
    })
  })

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup()
    vi.mocked(expenseApi.getExpenses).mockResolvedValue(sampleExpenses)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPage()

    await screen.findByRole('heading', { name: 'Weekly shopping' })
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    expect(expenseApi.deleteExpense).not.toHaveBeenCalled()
  })

  it('deletes an expense after confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(expenseApi.getExpenses)
      .mockResolvedValueOnce(sampleExpenses)
      .mockResolvedValueOnce([sampleExpenses[1]])
    vi.mocked(expenseApi.deleteExpense).mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()

    await screen.findByRole('heading', { name: 'Weekly shopping' })
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    await waitFor(() => {
      expect(expenseApi.deleteExpense).toHaveBeenCalledWith(1)
    })
    expect(expenseApi.getExpenses).toHaveBeenLastCalledWith({}, undefined)
    expect(screen.getByRole('status')).toHaveTextContent(/Deleted expense "Weekly shopping"/i)
  })

  it('shows an error when deletion fails', async () => {
    const user = userEvent.setup()
    vi.mocked(expenseApi.getExpenses).mockResolvedValue(sampleExpenses)
    vi.mocked(expenseApi.deleteExpense).mockRejectedValue(
      new ApiClientError({ message: 'nope', code: 'UNEXPECTED_ERROR' }),
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()

    await screen.findByRole('heading', { name: 'Weekly shopping' })
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not delete "Weekly shopping"/i)
    expect(screen.getByRole('heading', { name: 'Weekly shopping' })).toBeInTheDocument()
  })

  it('preserves active filters after delete', async () => {
    const user = userEvent.setup()
    vi.mocked(expenseApi.getExpenses)
      .mockResolvedValueOnce(sampleExpenses)
      .mockResolvedValueOnce([sampleExpenses[0]])
      .mockResolvedValueOnce([sampleExpenses[0]])
    vi.mocked(expenseApi.deleteExpense).mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()

    await screen.findByRole('heading', { name: 'Weekly shopping' })
    await user.selectOptions(screen.getByLabelText('Category'), '1')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    await waitFor(() => {
      expect(expenseApi.getExpenses).toHaveBeenLastCalledWith({ categoryId: 1 }, undefined)
    })
  })

  it('shows create success message from navigation state', async () => {
    vi.mocked(expenseApi.getExpenses).mockResolvedValue([])
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/transactions/expenses',
            state: { successMessage: 'Created expense "Lunch".' },
          },
        ]}
      >
        <Routes>
          <Route path="/transactions/expenses" element={<ExpensesPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Created expense "Lunch".')).toBeInTheDocument()
  })
})
