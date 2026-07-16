import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import { AuthProvider } from '../../auth/AuthContext'
import * as authApi from '../../auth/api/authApi'
import * as expenseApi from '../../expenses/api/expenseApi'
import * as incomeApi from '../../income/api/incomeApi'
import * as dashboardApi from '../api/dashboardApi'
import { DashboardPage } from './DashboardPage'

vi.mock('../api/dashboardApi', () => ({
  getMonthlyDashboard: vi.fn(),
}))

vi.mock('../../expenses/api/expenseApi', () => ({
  getExpenses: vi.fn(),
}))

vi.mock('../../income/api/incomeApi', () => ({
  getIncomeEntries: vi.fn(),
}))

vi.mock('../../recurring/api/recurringApi', () => ({
  markRecurringExpensePaid: vi.fn(),
}))

vi.mock('../../recurringIncome/api/recurringIncomeApi', () => ({
  markRecurringIncomeReceived: vi.fn(),
}))

vi.mock('../../auth/api/authApi', () => ({
  getMe: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}))

const sampleDashboard = {
  year: 2026,
  month: 7,
  totalIncome: 3250.5,
  totalExpenses: 200.25,
  netCashFlow: 3050.25,
  incomeEntryCount: 2,
  expenseEntryCount: 2,
  spendingByCategory: [
    { categoryId: 2, categoryName: 'Utilities', total: 120.25, entryCount: 1 },
    { categoryId: 1, categoryName: 'Groceries', total: 80, entryCount: 1 },
  ],
  incomeBySource: [
    { source: 'Salary', total: 3000, entryCount: 1 },
    { source: 'Freelance', total: 250.5, entryCount: 1 },
  ],
  largestExpense: {
    id: 21,
    description: 'Power',
    amount: 120.25,
    expenseDate: '2026-07-05',
    categoryName: 'Utilities',
  },
  largestIncome: {
    id: 10,
    description: 'Paycheck',
    amount: 3000,
    incomeDate: '2026-07-01',
    source: 'Salary',
  },
  budget: {
    id: 1,
    totalLimit: 2000,
    actualExpenses: 200.25,
    remaining: 1799.75,
    percentUsed: 10.01,
    overBudget: false,
  },
  planning: {
    expectedIncome: 1000,
    expectedExpenses: 250,
    projectedCashFlow: 750,
    upcomingIncomeCount: 1,
    upcomingExpenseCount: 1,
    upcomingIncomeItems: [
      {
        id: 1,
        description: 'Paycheck',
        source: 'Salary',
        amount: 1000,
        nextIncomeDate: '2099-01-01',
        cadence: 'MONTHLY',
      },
    ],
    upcomingExpenseItems: [
      {
        id: 2,
        description: 'Rent',
        categoryName: 'Housing',
        amount: 250,
        nextPaymentDate: '2099-01-02',
        cadence: 'MONTHLY',
      },
    ],
  },
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(dashboardApi.getMonthlyDashboard).mockReset()
    vi.mocked(expenseApi.getExpenses).mockResolvedValue([])
    vi.mocked(incomeApi.getIncomeEntries).mockResolvedValue([])
    vi.mocked(authApi.getMe).mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      displayName: 'Sheena',
      createdAt: '2026-01-01T00:00:00Z',
      lastLoginAt: null,
    })
  })

  it('shows personalized greeting, action hub, and decision metrics', async () => {
    vi.mocked(dashboardApi.getMonthlyDashboard).mockResolvedValue(sampleDashboard)

    renderPage()

    expect(screen.getByText('Loading dashboard…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /Sheena/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What would you like to do?' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add Expense/i })).toHaveAttribute(
      'href',
      '/transactions/expenses/add',
    )
    expect(screen.getByRole('heading', { name: 'Recent activity' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Upcoming' })).toBeInTheDocument()
    expect(screen.getByText('Remaining budget')).toBeInTheDocument()
    expect(screen.getByText('Safe to spend')).toBeInTheDocument()
  })

  it('shows activity items from expenses and income', async () => {
    vi.mocked(dashboardApi.getMonthlyDashboard).mockResolvedValue(sampleDashboard)
    vi.mocked(expenseApi.getExpenses).mockResolvedValue([
      {
        id: 5,
        description: 'Coffee',
        merchant: null,
        amount: 4.5,
        expenseDate: '2026-07-10',
        category: { id: 1, name: 'Dining' },
        notes: null,
        createdAt: '2026-07-10T00:00:00Z',
        updatedAt: '2026-07-10T00:00:00Z',
      },
    ] as never)
    vi.mocked(incomeApi.getIncomeEntries).mockResolvedValue([
      {
        id: 9,
        description: 'Bonus',
        source: 'Work',
        amount: 100,
        incomeDate: '2026-07-11',
        notes: null,
        recurringIncomeId: null,
        createdAt: '2026-07-11T00:00:00Z',
        updatedAt: '2026-07-11T00:00:00Z',
      },
    ] as never)

    renderPage()

    expect(await screen.findByText(/Coffee/)).toBeInTheDocument()
    expect(screen.getByText(/Bonus/)).toBeInTheDocument()
  })

  it('shows API validation errors and allows retry', async () => {
    const user = userEvent.setup()
    vi.mocked(dashboardApi.getMonthlyDashboard)
      .mockRejectedValueOnce(
        new ApiClientError({
          message: 'Invalid month',
          code: 'INVALID_REQUEST',
          status: 400,
        }),
      )
      .mockResolvedValueOnce(sampleDashboard)

    renderPage()

    expect(await screen.findByText('Invalid month')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: 'What would you like to do?' })).toBeInTheDocument()
  })

  it('applies a new period from the form', async () => {
    const user = userEvent.setup()
    vi.mocked(dashboardApi.getMonthlyDashboard).mockResolvedValue(sampleDashboard)

    renderPage()
    await screen.findByRole('heading', { name: /Sheena/ })

    await user.selectOptions(screen.getByLabelText('Month'), '8')
    await user.clear(screen.getByLabelText('Year'))
    await user.type(screen.getByLabelText('Year'), '2025')
    await user.click(screen.getByRole('button', { name: 'Update report' }))

    await waitFor(() => {
      expect(dashboardApi.getMonthlyDashboard).toHaveBeenCalledWith(
        { year: 2025, month: 8 },
        expect.any(AbortSignal),
      )
    })
  })

  it('expands projected income breakdown when the hero metric is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(dashboardApi.getMonthlyDashboard).mockResolvedValue(sampleDashboard)

    renderPage()

    const toggle = await screen.findByRole('button', { name: 'Projected income' })
    expect(screen.queryByText('Total projected income')).not.toBeInTheDocument()

    await user.click(toggle)

    expect(screen.getByText('Recorded income')).toBeVisible()
    expect(screen.getByText('Expected recurring income')).toBeVisible()
    expect(screen.getByText('Total projected income')).toBeVisible()
    expect(screen.getAllByText('$4,250.50').length).toBeGreaterThan(0)

    await user.click(toggle)
    expect(screen.queryByText('Total projected income')).not.toBeInTheDocument()
  })
})
