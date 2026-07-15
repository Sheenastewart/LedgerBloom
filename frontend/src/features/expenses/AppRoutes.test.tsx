import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../App'
import * as categoryApi from '../categories/api/categoryApi'
import * as expenseApi from '../expenses/api/expenseApi'

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
    planning: {
      expectedIncome: 0,
      expectedExpenses: 0,
      projectedCashFlow: 0,
      upcomingIncomeCount: 0,
      upcomingExpenseCount: 0,
      upcomingIncomeItems: [],
      upcomingExpenseItems: [],
    },
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


vi.mock('../recurring/api/recurringApi', () => ({
  getRecurringExpenses: vi.fn().mockResolvedValue([]),
  getUpcomingRecurringExpenses: vi.fn().mockResolvedValue([]),
  getRecurringExpense: vi.fn(),
  createRecurringExpense: vi.fn(),
  updateRecurringExpense: vi.fn(),
  deleteRecurringExpense: vi.fn(),
  markRecurringExpensePaid: vi.fn(),
}))

vi.mock('../recurringIncome/api/recurringIncomeApi', () => ({
  getRecurringIncome: vi.fn().mockResolvedValue([]),
  getUpcomingRecurringIncome: vi.fn().mockResolvedValue([]),
  getRecurringIncomeById: vi.fn(),
  createRecurringIncome: vi.fn(),
  updateRecurringIncome: vi.fn(),
  deleteRecurringIncome: vi.fn(),
  markRecurringIncomeReceived: vi.fn(),
}))

describe('Expense routes', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(categoryApi.getCategories).mockResolvedValue([])
    vi.mocked(expenseApi.getExpenses).mockResolvedValue([])
  })

  it('navigates between Home, Categories, and Expenses', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'LedgerBloom' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Categories' }))
    expect(await screen.findByRole('heading', { name: 'Categories' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Expenses' }))
    expect(await screen.findByRole('heading', { name: 'Expenses' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('heading', { name: 'LedgerBloom' })).toBeInTheDocument()
  })

  it('renders Add expense from the Expenses page', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/expenses']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Expenses' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('link', { name: 'Add expense' })[0])
    expect(await screen.findByRole('heading', { name: 'Add expense' })).toBeInTheDocument()
  })

  it('shows not found for an invalid edit id', async () => {
    render(
      <MemoryRouter initialEntries={['/expenses/0/edit']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Expense not found' })).toBeInTheDocument()
    expect(expenseApi.getExpense).not.toHaveBeenCalled()
  })
})
