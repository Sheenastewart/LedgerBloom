import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import * as budgetApi from '../api/budgetApi'
import { BudgetFormPage } from './BudgetFormPage'

vi.mock('../api/budgetApi', () => ({
  getMonthlyBudget: vi.fn(),
  createMonthlyBudget: vi.fn(),
  updateMonthlyBudget: vi.fn(),
  deleteMonthlyBudget: vi.fn(),
  createGroupLimit: vi.fn(),
  updateGroupLimit: vi.fn(),
  deleteGroupLimit: vi.fn(),
  restoreDefaultGroupLimits: vi.fn(),
}))

function renderCreate(entry = '/budgets/new?year=2026&month=7') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/budgets/new" element={<BudgetFormPage mode="create" />} />
        <Route path="/budgets" element={<p>Budgets home</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderEdit(entry = '/budgets/10/edit?year=2026&month=7') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/budgets/:id/edit" element={<BudgetFormPage mode="edit" />} />
        <Route path="/budgets" element={<p>Budgets home</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BudgetFormPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(budgetApi.getMonthlyBudget).mockReset()
    vi.mocked(budgetApi.createMonthlyBudget).mockReset()
    vi.mocked(budgetApi.updateMonthlyBudget).mockReset()
  })

  it('creates a budget and returns to the budgets list', async () => {
    const user = userEvent.setup()
    vi.mocked(budgetApi.createMonthlyBudget).mockResolvedValue({
      id: 10,
      year: 2026,
      month: 7,
      totalLimit: 1000,
      actualExpenses: 0,
      budgetableExpenses: 0,
      assistanceApplied: 0,
      remaining: 1000,
      percentUsed: 0,
      overBudget: false,
      userModified: false,
      expenseCount: 0,
      groupLimits: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })

    renderCreate()

    await user.type(screen.getByLabelText('Total limit'), '1000.00')
    await user.click(screen.getByRole('button', { name: 'Create budget' }))

    await waitFor(() => {
      expect(budgetApi.createMonthlyBudget).toHaveBeenCalledWith({
        year: 2026,
        month: 7,
        totalLimit: 1000,
      })
    })
    expect(await screen.findByText('Budgets home')).toBeInTheDocument()
  })

  it('validates invalid total limit', async () => {
    const user = userEvent.setup()
    renderCreate()

    await user.type(screen.getByLabelText('Total limit'), '0')
    await user.click(screen.getByRole('button', { name: 'Create budget' }))

    expect(await screen.findByText(/greater than zero/i)).toBeInTheDocument()
    expect(budgetApi.createMonthlyBudget).not.toHaveBeenCalled()
  })

  it('shows duplicate budget error', async () => {
    const user = userEvent.setup()
    vi.mocked(budgetApi.createMonthlyBudget).mockRejectedValue(
      new ApiClientError({
        message: 'A monthly budget already exists for 2026-7',
        code: 'BUDGET_ALREADY_EXISTS',
        status: 409,
      }),
    )

    renderCreate()
    await user.type(screen.getByLabelText('Total limit'), '1000.00')
    await user.click(screen.getByRole('button', { name: 'Create budget' }))

    expect(
      await screen.findByText('A monthly budget already exists for 2026-7'),
    ).toBeInTheDocument()
  })

  it('edits an existing budget', async () => {
    const user = userEvent.setup()
    vi.mocked(budgetApi.getMonthlyBudget).mockResolvedValue({
      id: 10,
      year: 2026,
      month: 7,
      totalLimit: 1000,
      actualExpenses: 0,
      budgetableExpenses: 0,
      assistanceApplied: 0,
      remaining: 1000,
      percentUsed: 0,
      overBudget: false,
      userModified: false,
      expenseCount: 0,
      groupLimits: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })
    vi.mocked(budgetApi.updateMonthlyBudget).mockResolvedValue({
      id: 10,
      year: 2026,
      month: 7,
      totalLimit: 1500,
      actualExpenses: 0,
      budgetableExpenses: 0,
      assistanceApplied: 0,
      remaining: 1500,
      percentUsed: 0,
      overBudget: false,
      userModified: true,
      expenseCount: 0,
      groupLimits: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })

    renderEdit()
    expect(await screen.findByRole('heading', { name: 'Edit budget' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByLabelText('Total limit')).toHaveValue('1000')
    })

    await user.clear(screen.getByLabelText('Total limit'))
    await user.type(screen.getByLabelText('Total limit'), '1500.00')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(budgetApi.updateMonthlyBudget).toHaveBeenCalledWith(10, { totalLimit: 1500 })
    })
    expect(await screen.findByText('Budgets home')).toBeInTheDocument()
  })
})
