import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import * as incomeApi from '../api/incomeApi'
import { IncomeFormPage } from './IncomeFormPage'

vi.mock('../api/incomeApi', () => ({
  getIncomeEntry: vi.fn(),
  createIncomeEntry: vi.fn(),
  updateIncomeEntry: vi.fn(),
}))

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={['/income/new']}>
      <Routes>
        <Route path="/income/new" element={<IncomeFormPage mode="create" />} />
        <Route path="/income" element={<p>Income home</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderEdit(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/income/:id/edit" element={<IncomeFormPage mode="edit" />} />
        <Route path="/income" element={<p>Income home</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('IncomeFormPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(incomeApi.getIncomeEntry).mockReset()
    vi.mocked(incomeApi.createIncomeEntry).mockReset()
    vi.mocked(incomeApi.updateIncomeEntry).mockReset()
  })

  it('renders the create form', async () => {
    renderCreate()
    expect(await screen.findByRole('heading', { name: 'Add income' })).toBeInTheDocument()
    expect(screen.getByLabelText('Source')).toBeInTheDocument()
  })

  it('creates an income entry successfully', async () => {
    const user = userEvent.setup()
    vi.mocked(incomeApi.createIncomeEntry).mockResolvedValue({
      id: 3,
      description: 'Paycheck',
      source: 'Employer',
      amount: 1200.5,
      incomeDate: '2026-07-10',
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })

    renderCreate()
    await screen.findByRole('heading', { name: 'Add income' })

    await user.type(screen.getByLabelText('Description'), 'Paycheck')
    await user.type(screen.getByLabelText('Source'), 'Employer')
    await user.type(screen.getByLabelText('Amount'), '1200.50')
    await user.type(screen.getByLabelText('Income date'), '2026-07-10')
    await user.click(screen.getByRole('button', { name: 'Create income' }))

    await waitFor(() => {
      expect(incomeApi.createIncomeEntry).toHaveBeenCalledWith({
        description: 'Paycheck',
        source: 'Employer',
        amount: 1200.5,
        incomeDate: '2026-07-10',
        notes: null,
      })
    })
    expect(await screen.findByText('Income home')).toBeInTheDocument()
  })

  it('loads an existing income entry for edit', async () => {
    vi.mocked(incomeApi.getIncomeEntry).mockResolvedValue({
      id: 7,
      description: 'Monthly paycheck',
      source: 'Employer',
      amount: 4500.5,
      incomeDate: '2026-07-10',
      notes: 'july',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })

    renderEdit('/income/7/edit')

    expect(await screen.findByDisplayValue('Monthly paycheck')).toBeInTheDocument()
    expect(screen.getByDisplayValue('4500.5')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Edit income' })).toBeInTheDocument()
  })

  it('shows not-found for an invalid route id without calling the API', async () => {
    renderEdit('/income/abc/edit')

    expect(
      await screen.findByRole('heading', { name: 'Income entry not found' }),
    ).toBeInTheDocument()
    expect(incomeApi.getIncomeEntry).not.toHaveBeenCalled()
  })

  it('shows not-found when the API returns 404', async () => {
    vi.mocked(incomeApi.getIncomeEntry).mockRejectedValue(
      new ApiClientError({ message: 'missing', code: 'INCOME_ENTRY_NOT_FOUND', status: 404 }),
    )

    renderEdit('/income/99/edit')

    expect(
      await screen.findByRole('heading', { name: 'Income entry not found' }),
    ).toBeInTheDocument()
  })

  it('submits a successful update', async () => {
    const user = userEvent.setup()
    vi.mocked(incomeApi.getIncomeEntry).mockResolvedValue({
      id: 7,
      description: 'Monthly paycheck',
      source: 'Employer',
      amount: 4500.5,
      incomeDate: '2026-07-10',
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })
    vi.mocked(incomeApi.updateIncomeEntry).mockResolvedValue({
      id: 7,
      description: 'Monthly paycheck',
      source: 'New Employer',
      amount: 4500.5,
      incomeDate: '2026-07-10',
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    })

    renderEdit('/income/7/edit')
    await screen.findByDisplayValue('Monthly paycheck')

    await user.clear(screen.getByLabelText('Source'))
    await user.type(screen.getByLabelText('Source'), 'New Employer')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(incomeApi.updateIncomeEntry).toHaveBeenCalledWith(7, {
        description: 'Monthly paycheck',
        source: 'New Employer',
        amount: 4500.5,
        incomeDate: '2026-07-10',
        notes: null,
      })
    })
    expect(await screen.findByText('Income home')).toBeInTheDocument()
  })

  it('shows backend validation errors on submit', async () => {
    const user = userEvent.setup()
    vi.mocked(incomeApi.createIncomeEntry).mockRejectedValue(
      new ApiClientError({
        message: 'Amount must be greater than zero',
        code: 'VALIDATION_FAILED',
        status: 400,
        fieldErrors: [{ field: 'amount', message: 'Amount must be greater than zero' }],
      }),
    )

    renderCreate()
    await screen.findByRole('heading', { name: 'Add income' })

    await user.type(screen.getByLabelText('Description'), 'Paycheck')
    await user.type(screen.getByLabelText('Source'), 'Employer')
    await user.type(screen.getByLabelText('Amount'), '1200.50')
    await user.type(screen.getByLabelText('Income date'), '2026-07-10')
    await user.click(screen.getByRole('button', { name: 'Create income' }))

    expect(await screen.findByText('Amount must be greater than zero')).toBeInTheDocument()
  })
})
