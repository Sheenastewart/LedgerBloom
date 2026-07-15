import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import * as dashboardApi from '../../dashboard/api/dashboardApi'
import * as exportsApi from '../api/exportsApi'
import * as reportsApi from '../api/reportsApi'
import { MonthlyReportPage } from './MonthlyReportPage'

vi.mock('../../dashboard/api/dashboardApi', () => ({
  getMonthlyDashboard: vi.fn(),
}))

vi.mock('../api/reportsApi', () => ({
  getMonthlyComparison: vi.fn(),
  getYearToDate: vi.fn(),
}))

vi.mock('../api/exportsApi', () => ({
  downloadMonthlyTransactionsCsv: vi.fn(),
  downloadMonthlySummaryCsv: vi.fn(),
  saveCsvDownload: vi.fn(),
}))

const sampleDashboard = {
  year: 2026,
  month: 7,
  totalIncome: 3250.5,
  totalExpenses: 200.25,
  netCashFlow: 3050.25,
  incomeEntryCount: 2,
  expenseEntryCount: 2,
  spendingByCategory: [{ categoryId: 1, categoryName: 'Groceries', total: 80, entryCount: 1 }],
  incomeBySource: [{ source: 'Salary', total: 3000, entryCount: 1 }],
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
    id: 5,
    totalLimit: 1000,
    actualExpenses: 200.25,
    remaining: 799.75,
    percentUsed: 20.03,
    overBudget: false,
  },
  planning: {
    expectedIncome: 100,
    expectedExpenses: 50,
    projectedCashFlow: 3100.25,
    upcomingIncomeCount: 0,
    upcomingExpenseCount: 0,
    upcomingIncomeItems: [],
    upcomingExpenseItems: [],
  },
}

const sampleComparisonItem = {
  year: 2026,
  month: 7,
  totalIncome: 3250.5,
  totalExpenses: 200.25,
  netCashFlow: 3050.25,
  incomeCount: 2,
  expenseCount: 2,
  budgetLimit: 1000,
  remainingBudget: 799.75,
  budgetPercentUsed: 20.03,
  overBudget: false,
  expectedRecurringIncome: 100,
  expectedRecurringExpenses: 50,
  projectedCashFlow: 3100.25,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/reports/monthly']}>
      <Routes>
        <Route path="/reports/monthly" element={<MonthlyReportPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MonthlyReportPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(dashboardApi.getMonthlyDashboard).mockReset()
    vi.mocked(reportsApi.getMonthlyComparison).mockReset()
  })

  it('shows loading then the report sections', async () => {
    vi.mocked(dashboardApi.getMonthlyDashboard).mockResolvedValue(sampleDashboard)
    vi.mocked(reportsApi.getMonthlyComparison).mockResolvedValue({
      startYear: 2026,
      startMonth: 7,
      endYear: 2026,
      endMonth: 7,
      monthCount: 1,
      months: [sampleComparisonItem],
    })

    renderPage()

    expect(screen.getByText('Loading monthly report…')).toBeInTheDocument()
    expect(await screen.findByText('Total income')).toBeInTheDocument()
    expect(screen.getAllByText('$3,250.50').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Budget' })).toBeInTheDocument()
    expect(screen.getAllByText('On track').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Cash flow planning' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Report summary' })).toBeInTheDocument()
  })

  it('shows Retry when the API is unavailable', async () => {
    const user = userEvent.setup()
    vi.mocked(dashboardApi.getMonthlyDashboard)
      .mockRejectedValueOnce(new ApiClientError({ message: 'down', code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce(sampleDashboard)
    vi.mocked(reportsApi.getMonthlyComparison).mockResolvedValue({
      startYear: 2026,
      startMonth: 7,
      endYear: 2026,
      endMonth: 7,
      monthCount: 1,
      months: [sampleComparisonItem],
    })

    renderPage()

    expect(
      await screen.findByText('Unable to load the monthly report. Please try again.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Total income')).toBeInTheDocument()
  })

  it('renders a Print report button that calls window.print', async () => {
    const user = userEvent.setup()
    vi.mocked(dashboardApi.getMonthlyDashboard).mockResolvedValue(sampleDashboard)
    vi.mocked(reportsApi.getMonthlyComparison).mockResolvedValue({
      startYear: 2026,
      startMonth: 7,
      endYear: 2026,
      endMonth: 7,
      monthCount: 1,
      months: [sampleComparisonItem],
    })
    const printSpy = vi.fn()
    vi.stubGlobal('print', printSpy)

    renderPage()
    await screen.findByText('Total income')

    await user.click(screen.getByRole('button', { name: 'Print report' }))
    expect(printSpy).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })

  it('downloads a CSV export from the monthly report page', async () => {
    const user = userEvent.setup()
    vi.mocked(dashboardApi.getMonthlyDashboard).mockResolvedValue(sampleDashboard)
    vi.mocked(reportsApi.getMonthlyComparison).mockResolvedValue({
      startYear: 2026,
      startMonth: 7,
      endYear: 2026,
      endMonth: 7,
      monthCount: 1,
      months: [sampleComparisonItem],
    })
    vi.mocked(exportsApi.downloadMonthlyTransactionsCsv).mockResolvedValue({
      blob: new Blob(['csv']),
      filename: 'ledgerbloom-transactions-2026-07.csv',
    })

    renderPage()
    await screen.findByText('Total income')

    await user.click(screen.getByRole('button', { name: 'Download transactions CSV' }))

    expect(exportsApi.saveCsvDownload).toHaveBeenCalledWith({
      blob: expect.any(Blob),
      filename: 'ledgerbloom-transactions-2026-07.csv',
    })
  })
})
