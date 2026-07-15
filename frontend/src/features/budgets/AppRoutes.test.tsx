import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../api/ApiClientError'
import { AppRoutes } from '../../App'
import * as budgetApi from './api/budgetApi'

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

vi.mock('./api/budgetApi', () => ({
  getMonthlyBudget: vi.fn(),
  createMonthlyBudget: vi.fn(),
  updateMonthlyBudget: vi.fn(),
  deleteMonthlyBudget: vi.fn(),
  createCategoryLimit: vi.fn(),
  updateCategoryLimit: vi.fn(),
  deleteCategoryLimit: vi.fn(),
}))

describe('Budget routes', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(budgetApi.getMonthlyBudget).mockRejectedValue(
      new ApiClientError({ message: 'missing', code: 'BUDGET_NOT_FOUND', status: 404 }),
    )
  })

  it('navigates from Home to Budgets via nav and CTA', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'LedgerBloom' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Budgets' }))
    expect(await screen.findByRole('heading', { name: 'Budgets' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Home' }))
    await user.click(screen.getByRole('link', { name: 'Manage budgets' }))
    expect(await screen.findByRole('heading', { name: 'Budgets' })).toBeInTheDocument()
  })
})
