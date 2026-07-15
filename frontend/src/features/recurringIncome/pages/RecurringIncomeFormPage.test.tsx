import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as recurringIncomeApi from '../api/recurringIncomeApi'
import { RecurringIncomeFormPage } from './RecurringIncomeFormPage'

vi.mock('../api/recurringIncomeApi', () => ({
  getRecurringIncome: vi.fn(),
  getUpcomingRecurringIncome: vi.fn(),
  getRecurringIncomeById: vi.fn(),
  createRecurringIncome: vi.fn(),
  updateRecurringIncome: vi.fn(),
  deleteRecurringIncome: vi.fn(),
  markRecurringIncomeReceived: vi.fn(),
}))

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={['/recurring-income/new']}>
      <Routes>
        <Route path="/recurring-income/new" element={<RecurringIncomeFormPage mode="create" />} />
        <Route path="/recurring-income" element={<p>Recurring income home</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RecurringIncomeFormPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(recurringIncomeApi.createRecurringIncome).mockReset()
    vi.mocked(recurringIncomeApi.updateRecurringIncome).mockReset()
  })

  it('creates a recurring income entry', async () => {
    const user = userEvent.setup()
    vi.mocked(recurringIncomeApi.createRecurringIncome).mockResolvedValue({
      id: 10,
      description: 'Paycheck',
      source: 'Employer',
      amount: 4500,
      cadence: 'BIWEEKLY',
      nextIncomeDate: '2026-08-01',
      active: true,
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })

    renderCreate()
    expect(await screen.findByLabelText('Description')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Description'), 'Paycheck')
    await user.type(screen.getByLabelText('Source'), 'Employer')
    await user.type(screen.getByLabelText('Amount'), '4500')
    await user.selectOptions(screen.getByLabelText('Cadence'), 'BIWEEKLY')
    await user.type(screen.getByLabelText('Next income date'), '2026-08-01')
    await user.click(screen.getByRole('button', { name: 'Create recurring income' }))

    await waitFor(() => {
      expect(recurringIncomeApi.createRecurringIncome).toHaveBeenCalled()
    })
    expect(await screen.findByText('Recurring income home')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    renderCreate()
    await screen.findByLabelText('Description')
    await user.click(screen.getByRole('button', { name: 'Create recurring income' }))
    expect(await screen.findByText('Description is required.')).toBeInTheDocument()
    expect(recurringIncomeApi.createRecurringIncome).not.toHaveBeenCalled()
  })
})
