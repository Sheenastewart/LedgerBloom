import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../api/ApiClientError'
import { AppRoutes } from '../../App'
import * as authApi from './api/authApi'

vi.mock('../../api/health', () => ({
  fetchHealth: vi.fn().mockResolvedValue({ status: 'UP', service: 'ledgerbloom-api' }),
}))

vi.mock('./api/authApi', () => ({
  getMe: vi.fn(),
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

const sampleUser = {
  id: 1,
  email: 'user@example.com',
  displayName: 'Jane Doe',
  createdAt: '2026-01-01T00:00:00Z',
  lastLoginAt: '2026-07-15T00:00:00Z',
}

describe('Auth routes', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(authApi.getMe).mockReset()
    vi.mocked(authApi.login).mockReset()
    vi.mocked(authApi.register).mockReset()
    vi.mocked(authApi.logout).mockReset()
  })

  it('redirects an unauthenticated visitor from a protected route to the login page', async () => {
    vi.mocked(authApi.getMe).mockRejectedValue(
      new ApiClientError({ message: 'Authentication required', code: 'UNAUTHORIZED', status: 401 }),
    )

    render(
      <MemoryRouter initialEntries={['/categories']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('logs in successfully and redirects back to the originally requested page', async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.getMe).mockRejectedValue(
      new ApiClientError({ message: 'Authentication required', code: 'UNAUTHORIZED', status: 401 }),
    )
    vi.mocked(authApi.login).mockResolvedValue(sampleUser)

    render(
      <MemoryRouter initialEntries={['/categories']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'supersecret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Categories' })).toBeInTheDocument()
    expect(authApi.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'supersecret',
    })
  })

  it('shows an error banner when login fails with invalid credentials', async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.getMe).mockRejectedValue(
      new ApiClientError({ message: 'Authentication required', code: 'UNAUTHORIZED', status: 401 }),
    )
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiClientError({ message: 'Invalid credentials', code: 'INVALID_CREDENTIALS', status: 401 }),
    )

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByText('Incorrect email or password. Please try again.'),
    ).toBeInTheDocument()
  })

  it('navigates from Home to Register and shows client-side validation errors', async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.getMe).mockRejectedValue(
      new ApiClientError({ message: 'Authentication required', code: 'UNAUTHORIZED', status: 401 }),
    )

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Sign up' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Sign up' }))

    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(screen.getByText('Display name is required')).toBeInTheDocument()
    expect(authApi.register).not.toHaveBeenCalled()
  })

  it('registers successfully, signs in, and navigates to the dashboard', async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.getMe).mockRejectedValue(
      new ApiClientError({ message: 'Authentication required', code: 'UNAUTHORIZED', status: 401 }),
    )
    vi.mocked(authApi.register).mockResolvedValue(sampleUser)
    vi.mocked(authApi.login).mockResolvedValue(sampleUser)

    render(
      <MemoryRouter initialEntries={['/register']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Display name'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'supersecret')
    await user.type(screen.getByLabelText('Confirm password'), 'supersecret')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'Monthly dashboard' })).toBeInTheDocument()
    expect(authApi.register).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'supersecret',
      confirmPassword: 'supersecret',
      displayName: 'Jane Doe',
    })
    expect(authApi.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'supersecret',
    })
  })

  it('shows a duplicate email error from the server on register', async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.getMe).mockRejectedValue(
      new ApiClientError({ message: 'Authentication required', code: 'UNAUTHORIZED', status: 401 }),
    )
    vi.mocked(authApi.register).mockRejectedValue(
      new ApiClientError({
        message: 'An account with this email already exists',
        code: 'EMAIL_ALREADY_EXISTS',
        status: 409,
      }),
    )

    render(
      <MemoryRouter initialEntries={['/register']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Display name'), 'Jane Doe')
    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'supersecret')
    await user.type(screen.getByLabelText('Confirm password'), 'supersecret')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      await screen.findByText('An account with this email already exists'),
    ).toBeInTheDocument()
  })

  it('logs out and returns the nav to the anonymous state', async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.getMe).mockResolvedValue(sampleUser)
    vi.mocked(authApi.logout).mockResolvedValue(undefined)

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Log out' }))

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: 'Log in' }).length).toBeGreaterThan(0)
    })
    expect(authApi.logout).toHaveBeenCalled()
  })
})
