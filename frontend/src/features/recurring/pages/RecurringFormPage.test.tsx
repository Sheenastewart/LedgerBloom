import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as categoryApi from '../../categories/api/categoryApi'
import * as recurringApi from '../api/recurringApi'
import { RecurringFormPage } from './RecurringFormPage'

vi.mock('../api/recurringApi', () => ({
  getRecurringExpenses: vi.fn(),
  getUpcomingRecurringExpenses: vi.fn(),
  getRecurringExpense: vi.fn(),
  createRecurringExpense: vi.fn(),
  updateRecurringExpense: vi.fn(),
  deleteRecurringExpense: vi.fn(),
  markRecurringExpensePaid: vi.fn(),
}))

vi.mock('../../categories/api/categoryApi', () => ({
  getCategories: vi.fn(),
}))

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={['/recurring/new']}>
      <Routes>
        <Route path="/recurring/new" element={<RecurringFormPage mode="create" />} />
        <Route path="/recurring" element={<p>Recurring home</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RecurringFormPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(categoryApi.getCategories).mockResolvedValue([
      { id: 1, name: 'Entertainment', description: null, createdAt: '', updatedAt: '' },
    ])
    vi.mocked(recurringApi.createRecurringExpense).mockReset()
    vi.mocked(recurringApi.updateRecurringExpense).mockReset()
  })

  it('creates a recurring expense', async () => {
    const user = userEvent.setup()
    vi.mocked(recurringApi.createRecurringExpense).mockResolvedValue({
      id: 10,
      description: 'Netflix',
      merchant: null,
      amount: 15.99,
      category: { id: 1, name: 'Entertainment' },
      cadence: 'MONTHLY',
      nextPaymentDate: '2026-08-01',
      active: true,
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })

    renderCreate()
    expect(await screen.findByLabelText('Description')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Description'), 'Netflix')
    await user.type(screen.getByLabelText('Amount'), '15.99')
    await user.selectOptions(screen.getByLabelText('Category'), '1')
    await user.selectOptions(screen.getByLabelText('Cadence'), 'MONTHLY')
    await user.type(screen.getByLabelText('Next payment date'), '2026-08-01')
    await user.click(screen.getByRole('button', { name: 'Create recurring expense' }))

    await waitFor(() => {
      expect(recurringApi.createRecurringExpense).toHaveBeenCalled()
    })
    expect(await screen.findByText('Recurring home')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    renderCreate()
    await screen.findByLabelText('Description')
    await user.click(screen.getByRole('button', { name: 'Create recurring expense' }))
    expect(await screen.findByText('Description is required.')).toBeInTheDocument()
    expect(recurringApi.createRecurringExpense).not.toHaveBeenCalled()
  })
})
