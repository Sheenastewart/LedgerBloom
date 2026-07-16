import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../App'
import * as incomeApi from '../income/api/incomeApi'

vi.mock('../../api/health', () => ({
  fetchHealth: vi.fn().mockResolvedValue({ status: 'UP', service: 'ledgerbloom-api' }),
}))

vi.mock('../auth/api/authApi', () => ({
  getMe: vi.fn().mockResolvedValue({
    id: 1,
    email: 'user@example.com',
    displayName: 'Test User',
    createdAt: '2026-01-01T00:00:00Z',
    lastLoginAt: '2026-07-15T00:00:00Z',
  }),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
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
  getMonthlyBudget: vi.fn(),
  createMonthlyBudget: vi.fn(),
  updateMonthlyBudget: vi.fn(),
  deleteMonthlyBudget: vi.fn(),
  createGroupLimit: vi.fn(),
  updateGroupLimit: vi.fn(),
  deleteGroupLimit: vi.fn(),
  restoreDefaultGroupLimits: vi.fn(),
  generateMonthlyBudget: vi.fn(),
}))


vi.mock('../recurring/api/recurringApi', () => ({
  getRecurringExpenses: vi.fn().mockResolvedValue([]),
  getUpcomingRecurringExpenses: vi.fn().mockResolvedValue([]),
  getRecurringExpense: vi.fn(),
  createRecurringExpense: vi.fn(),
  updateRecurringExpense: vi.fn(),
  deleteRecurringExpense: vi.fn(),
  markRecurringExpensePaid: vi.fn(),
  previewRecurringExpenseOccurrences: vi.fn(),
  catchUpRecurringExpense: vi.fn(),
}))

vi.mock('../recurringIncome/api/recurringIncomeApi', () => ({
  getRecurringIncome: vi.fn().mockResolvedValue([]),
  getUpcomingRecurringIncome: vi.fn().mockResolvedValue([]),
  getRecurringIncomeById: vi.fn(),
  createRecurringIncome: vi.fn(),
  updateRecurringIncome: vi.fn(),
  deleteRecurringIncome: vi.fn(),
  markRecurringIncomeReceived: vi.fn(),
  previewRecurringIncomeOccurrences: vi.fn(),
  catchUpRecurringIncome: vi.fn(),
}))

vi.mock('../reports/api/reportsApi', () => ({
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

vi.mock('../reports/api/exportsApi', () => ({
  downloadMonthlyTransactionsCsv: vi.fn(),
  downloadMonthlySummaryCsv: vi.fn(),
  saveCsvDownload: vi.fn(),
}))

describe('Income routes', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(incomeApi.getIncomeEntries).mockResolvedValue([])
  })

  it('navigates from Dashboard to Income via Transactions', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: /Test User/ })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Transactions' }))
    expect(await screen.findByRole('heading', { name: 'All activity' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Income' }))
    expect(await screen.findByRole('heading', { name: 'Income' })).toBeInTheDocument()
  })

  it('renders Add income choice for one-time and recurring', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/transactions/income']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Income' })).toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: 'Add income' })[0])
    expect(await screen.findByText('Is this recurring?')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'One-time' }))
    expect(await screen.findByRole('heading', { name: 'Add income' })).toBeInTheDocument()
  })

  it('navigates from Income add choice to the recurring income form', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/transactions/income/add']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Is this recurring?')).toBeInTheDocument()
    const recurringChoice = screen
      .getAllByRole('link')
      .find((link) => link.getAttribute('href') === '/transactions/recurring-income/new')
    expect(recurringChoice).toBeTruthy()
    await user.click(recurringChoice!)
    expect(
      await screen.findByRole('heading', { name: 'Add recurring income' }),
    ).toBeInTheDocument()
  })

  it('shows not found for an invalid edit id', async () => {
    render(
      <MemoryRouter initialEntries={['/transactions/income/0/edit']}>
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
        recurringIncomeId: null,
        canUndoReceived: null,
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
      recurringIncomeId: null,
      canUndoReceived: null,
    })

    render(
      <MemoryRouter initialEntries={['/transactions/income']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Monthly paycheck' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Actions for Monthly paycheck' }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(await screen.findByRole('heading', { name: 'Edit income' })).toBeInTheDocument()
  })
})
