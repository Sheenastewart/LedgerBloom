import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../App'
import * as incomeApi from '../income/api/incomeApi'

vi.mock('../../api/health', () => ({
  fetchHealth: vi.fn().mockResolvedValue({ status: 'UP', service: 'ledgerbloom-api' }),
}))

vi.mock('../categories/api/categoryApi', () => ({
  getCategories: vi.fn().mockResolvedValue([]),
  getCategory: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}))

vi.mock('../expenses/api/expenseApi', () => ({
  getExpenses: vi.fn().mockResolvedValue([]),
  getExpense: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}))

vi.mock('../income/api/incomeApi', () => ({
  getIncomeEntries: vi.fn().mockResolvedValue([]),
  getIncomeEntry: vi.fn(),
  createIncomeEntry: vi.fn(),
  updateIncomeEntry: vi.fn(),
  deleteIncomeEntry: vi.fn(),
}))

vi.mock('../dashboard/api/dashboardApi', () => ({
  getMonthlyDashboard: vi.fn().mockResolvedValue({
    year: 2026,
    month: 7,
    totalIncome: 0,
    totalExpenses: 0,
    netCashFlow: 0,
    incomeEntryCount: 0,
    expenseEntryCount: 0,
    spendingByCategory: [],
    incomeBySource: [],
    largestExpense: null,
    largestIncome: null,
    budget: null,
  }),
}))

vi.mock('../budgets/api/budgetApi', () => ({
  getMonthlyBudget: vi.fn(),
  createMonthlyBudget: vi.fn(),
  updateMonthlyBudget: vi.fn(),
  deleteMonthlyBudget: vi.fn(),
  createCategoryLimit: vi.fn(),
  updateCategoryLimit: vi.fn(),
  deleteCategoryLimit: vi.fn(),
}))

describe('Income routes', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(incomeApi.getIncomeEntries).mockResolvedValue([])
  })

  it('navigates between Home and Income', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'LedgerBloom' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Income' }))
    expect(await screen.findByRole('heading', { name: 'Income' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('heading', { name: 'LedgerBloom' })).toBeInTheDocument()
  })

  it('renders Add income from the Income page', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/income']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Income' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('link', { name: 'Add income' })[0])
    expect(await screen.findByRole('heading', { name: 'Add income' })).toBeInTheDocument()
  })

  it('shows not found for an invalid edit id', async () => {
    render(
      <MemoryRouter initialEntries={['/income/0/edit']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Income entry not found' }),
    ).toBeInTheDocument()
    expect(incomeApi.getIncomeEntry).not.toHaveBeenCalled()
  })

  it('navigates from Income to the edit form', async () => {
    const user = userEvent.setup()
    vi.mocked(incomeApi.getIncomeEntries).mockResolvedValue([
      {
        id: 1,
        description: 'Monthly paycheck',
        source: 'Employer',
        amount: 4500.5,
        incomeDate: '2026-07-10',
        notes: null,
        createdAt: '2026-07-15T20:04:25.859404Z',
        updatedAt: '2026-07-15T20:04:25.859404Z',
      },
    ])
    vi.mocked(incomeApi.getIncomeEntry).mockResolvedValue({
      id: 1,
      description: 'Monthly paycheck',
      source: 'Employer',
      amount: 4500.5,
      incomeDate: '2026-07-10',
      notes: null,
      createdAt: '2026-07-15T20:04:25.859404Z',
      updatedAt: '2026-07-15T20:04:25.859404Z',
    })

    render(
      <MemoryRouter initialEntries={['/income']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Monthly paycheck' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Edit' }))
    expect(await screen.findByRole('heading', { name: 'Edit income' })).toBeInTheDocument()
  })
})
