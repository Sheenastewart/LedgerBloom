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
  previewRecurringIncomeOccurrences: vi.fn(),
  catchUpRecurringIncome: vi.fn(),
}))

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={['/transactions/recurring-income/new']}>
      <Routes>
        <Route path="/transactions/recurring-income/new" element={<RecurringIncomeFormPage mode="create" />} />
        <Route path="/transactions/income" element={<p>Recurring income hub</p>} />
        <Route path="/transactions/recurring-income" element={<p>Recurring income hub</p>} />
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
    vi.mocked(recurringIncomeApi.previewRecurringIncomeOccurrences).mockReset()
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
    expect(await screen.findByText('Recurring income hub')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    renderCreate()
    await screen.findByLabelText('Description')
    await user.click(screen.getByRole('button', { name: 'Create recurring income' }))
    expect(await screen.findByText('Description is required.')).toBeInTheDocument()
    expect(recurringIncomeApi.createRecurringIncome).not.toHaveBeenCalled()
  })

  it('shows semimonthly payment day fields with defaults when that cadence is selected', async () => {
    const user = userEvent.setup()
    renderCreate()
    await screen.findByLabelText('Description')

    await user.selectOptions(screen.getByLabelText('Cadence'), 'SEMIMONTHLY')

    expect(screen.getByLabelText('First day of month')).toHaveValue(1)
    expect(screen.getByLabelText('Second day of month')).toHaveValue(15)
    expect(screen.getByText(/twice each month/i)).toBeInTheDocument()
  })

  it('allows a past next income date and requires a history choice before submitting', async () => {
    const user = userEvent.setup()
    renderCreate()
    await screen.findByLabelText('Description')

    await user.type(screen.getByLabelText('Description'), 'Paycheck')
    await user.type(screen.getByLabelText('Source'), 'Employer')
    await user.type(screen.getByLabelText('Amount'), '4500')
    await user.selectOptions(screen.getByLabelText('Cadence'), 'BIWEEKLY')
    await user.type(screen.getByLabelText('Next income date'), '2020-01-01')

    expect(screen.queryByText(/must not be in the past/i)).not.toBeInTheDocument()
    expect(await screen.findByText('Track from now on')).toBeInTheDocument()
    expect(screen.getByText('Review and record past occurrences')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create recurring income' }))
    expect(await screen.findByText('Choose how to handle past occurrences.')).toBeInTheDocument()
    expect(recurringIncomeApi.createRecurringIncome).not.toHaveBeenCalled()
  })

  it('previews and records selected past occurrences', async () => {
    const user = userEvent.setup()
    vi.mocked(recurringIncomeApi.previewRecurringIncomeOccurrences).mockResolvedValue({
      occurrences: [{ occurrenceDate: '2020-01-01', amount: 4500 }],
      suggestedNextOnOrAfterToday: '2026-08-01',
    })
    vi.mocked(recurringIncomeApi.createRecurringIncome).mockResolvedValue({
      id: 13,
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
    await screen.findByLabelText('Description')

    await user.type(screen.getByLabelText('Description'), 'Paycheck')
    await user.type(screen.getByLabelText('Source'), 'Employer')
    await user.type(screen.getByLabelText('Amount'), '4500')
    await user.selectOptions(screen.getByLabelText('Cadence'), 'BIWEEKLY')
    await user.type(screen.getByLabelText('Next income date'), '2020-01-01')
    await user.click(await screen.findByText('Review and record past occurrences'))

    await waitFor(() => {
      expect(recurringIncomeApi.previewRecurringIncomeOccurrences).toHaveBeenCalled()
    })
    expect(await screen.findByText('01/01/2020')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create recurring income' }))

    await waitFor(() => {
      expect(recurringIncomeApi.createRecurringIncome).toHaveBeenCalledWith(
        expect.objectContaining({
          historyMode: 'RECORD_SELECTED',
          selectedOccurrenceDates: ['2020-01-01'],
        }),
      )
    })
  })
})
