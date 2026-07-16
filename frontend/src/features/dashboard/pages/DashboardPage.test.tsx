import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import * as dashboardApi from '../api/dashboardApi'
import { DashboardPage } from './DashboardPage'

vi.mock('../api/dashboardApi', () => ({
  getMonthlyDashboard: vi.fn(),
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
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
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
  })

  it('shows loading then dashboard totals', async () => {
    vi.mocked(dashboardApi.getMonthlyDashboard).mockResolvedValue(sampleDashboard)

    renderPage()

    expect(screen.getByText('Loading dashboard…')).toBeInTheDocument()
    expect(await screen.findByText('Total income')).toBeInTheDocument()
    expect(screen.getByText('$3,250.50')).toBeInTheDocument()
    expect(screen.getByText('$200.25')).toBeInTheDocument()
    expect(screen.getByText('$3,050.25')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Category' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Utilities/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Source' })).toBeInTheDocument()
    expect(screen.getByText('Paycheck · Salary')).toBeInTheDocument()
    expect(screen.getByText('Power · Utilities')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Cash Flow Planning' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Expected income/ })).toBeInTheDocument()
    expect(screen.getByText('No scheduled recurring income in this month.')).toBeInTheDocument()
  })

  it('shows empty-state messages for a quiet month', async () => {
    vi.mocked(dashboardApi.getMonthlyDashboard).mockResolvedValue({
      ...sampleDashboard,
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
    })

    renderPage()

    expect(
      await screen.findByText('No income or expense entries for this month.'),
    ).toBeInTheDocument()
    expect(screen.getByText('No budget set for this month.')).toBeInTheDocument()
    expect(screen.getByText('No expenses in this month.')).toBeInTheDocument()
    expect(screen.getByText('No income entries in this month.')).toBeInTheDocument()
  })

  it('shows Retry when the API is unavailable', async () => {
    const user = userEvent.setup()
    vi.mocked(dashboardApi.getMonthlyDashboard)
      .mockRejectedValueOnce(new ApiClientError({ message: 'down', code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce(sampleDashboard)

    renderPage()

    expect(
      await screen.findByText('Unable to load the monthly dashboard. Please try again.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('$3,250.50')).toBeInTheDocument()
  })

  it('reloads when the report period is updated', async () => {
    const user = userEvent.setup()
    vi.mocked(dashboardApi.getMonthlyDashboard)
      .mockResolvedValueOnce({ ...sampleDashboard, month: 7 })
      .mockResolvedValueOnce({ ...sampleDashboard, month: 6, year: 2026 })

    renderPage()
    await screen.findByText('$3,250.50')

    await user.selectOptions(screen.getByLabelText('Month'), '6')
    await user.clear(screen.getByLabelText('Year'))
    await user.type(screen.getByLabelText('Year'), '2026')
    await user.click(screen.getByRole('button', { name: 'Update report' }))

    await waitFor(() => {
      expect(dashboardApi.getMonthlyDashboard).toHaveBeenLastCalledWith(
        { year: 2026, month: 6 },
        expect.any(AbortSignal),
      )
    })
  })

  it('shows API validation message for invalid period responses', async () => {
    vi.mocked(dashboardApi.getMonthlyDashboard).mockRejectedValue(
      new ApiClientError({
        message: 'month must be between 1 and 12',
        code: 'INVALID_REQUEST',
        status: 400,
      }),
    )

    renderPage()

    expect(await screen.findByText('month must be between 1 and 12')).toBeInTheDocument()
  })

  it('shows budget overview when a budget exists', async () => {
    vi.mocked(dashboardApi.getMonthlyDashboard).mockResolvedValue({
      ...sampleDashboard,
      budget: {
        id: 10,
        totalLimit: 1000,
        actualExpenses: 200.25,
        remaining: 799.75,
        percentUsed: 20.03,
        overBudget: false,
      },
    })

    renderPage()

    expect(await screen.findByText('Budget overview')).toBeInTheDocument()
    expect(screen.getByText('Total budget')).toBeInTheDocument()
    expect(screen.getByText('$1,000.00')).toBeInTheDocument()
    expect(screen.getByText('On track')).toBeInTheDocument()
  })
})
