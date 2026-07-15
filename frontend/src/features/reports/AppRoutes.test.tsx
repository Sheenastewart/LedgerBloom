import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../App'
import * as reportsApi from './api/reportsApi'

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
  getMonthlyBudget: vi.fn().mockRejectedValue({ code: 'BUDGET_NOT_FOUND' }),
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

vi.mock('./api/reportsApi', () => ({
  getMonthlyComparison: vi.fn().mockResolvedValue({
    startYear: 2026,
    startMonth: 1,
    endYear: 2026,
    endMonth: 7,
    monthCount: 7,
    months: [],
  }),
  getYearToDate: vi.fn().mockResolvedValue({
    year: 2026,
    totals: { totalIncome: 0, totalExpenses: 0, netCashFlow: 0 },
    averages: { averageIncome: 0, averageExpenses: 0, averageNetCashFlow: 0 },
    highestIncomeMonth: null,
    highestExpenseMonth: null,
    bestNetCashFlowMonth: null,
    worstNetCashFlowMonth: null,
    totalBudgeted: 0,
    totalBudgetRemaining: 0,
    monthsOverBudget: 0,
    spendingByCategory: [],
    incomeBySource: [],
    monthSummaries: [],
  }),
}))

vi.mock('./api/exportsApi', () => ({
  downloadMonthlyTransactionsCsv: vi.fn(),
  downloadMonthlySummaryCsv: vi.fn(),
  saveCsvDownload: vi.fn(),
}))

describe('Reports routes', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(reportsApi.getMonthlyComparison).mockResolvedValue({
      startYear: 2026,
      startMonth: 1,
      endYear: 2026,
      endMonth: 7,
      monthCount: 7,
      months: [],
    })
    vi.mocked(reportsApi.getYearToDate).mockResolvedValue({
      year: 2026,
      totals: { totalIncome: 0, totalExpenses: 0, netCashFlow: 0 },
      averages: { averageIncome: 0, averageExpenses: 0, averageNetCashFlow: 0 },
      highestIncomeMonth: null,
      highestExpenseMonth: null,
      bestNetCashFlowMonth: null,
      worstNetCashFlowMonth: null,
      totalBudgeted: 0,
      totalBudgetRemaining: 0,
      monthsOverBudget: 0,
      spendingByCategory: [],
      incomeBySource: [],
      monthSummaries: [],
    })
  })

  it('navigates from Home to Reports via nav and CTA', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'LedgerBloom' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Reports' }))
    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Home' }))
    await user.click(screen.getByRole('link', { name: 'View reports' }))
    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument()
  })

  it('navigates between Trends, Year-to-date, and Monthly report from the overview', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/reports']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'View trends' }))
    expect(await screen.findByRole('heading', { name: 'Trends' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Year-to-date' }))
    expect(await screen.findByRole('heading', { name: 'Year-to-date' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Monthly report' }))
    expect(await screen.findByRole('heading', { name: 'Monthly report' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Overview' }))
    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument()
  })
})
