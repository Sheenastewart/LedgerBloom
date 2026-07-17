import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import * as reportsApi from '../api/reportsApi'
import { TrendsPage } from './TrendsPage'

vi.mock('../api/reportsApi', () => ({
  getMonthlyComparison: vi.fn(),
  getYearToDate: vi.fn(),
}))

const sampleComparison = {
  startYear: 2026,
  startMonth: 2,
  endYear: 2026,
  endMonth: 7,
  monthCount: 2,
  months: [
    {
      year: 2026,
      month: 6,
      totalIncome: 4000,
      totalExpenses: 2500,
      netCashFlow: 1500,
      incomeCount: 2,
      expenseCount: 5,
      budgetLimit: 3000,
      remainingBudget: 500,
      budgetPercentUsed: 83.33,
      overBudget: false,
      expectedRecurringIncome: 0,
      expectedRecurringExpenses: 0,
      projectedCashFlow: 1500,
    },
    {
      year: 2026,
      month: 7,
      totalIncome: 4200,
      totalExpenses: 4500,
      netCashFlow: -300,
      incomeCount: 2,
      expenseCount: 6,
      budgetLimit: null,
      remainingBudget: null,
      budgetPercentUsed: null,
      overBudget: null,
      expectedRecurringIncome: 100,
      expectedRecurringExpenses: 50,
      projectedCashFlow: -250,
    },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/reports/trends']}>
      <Routes>
        <Route path="/reports/trends" element={<TrendsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TrendsPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(reportsApi.getMonthlyComparison).mockReset()
  })

  it('shows loading then the trends table', async () => {
    vi.mocked(reportsApi.getMonthlyComparison).mockResolvedValue(sampleComparison)

    renderPage()

    expect(screen.getByText('Loading trends…')).toBeInTheDocument()
    expect(await screen.findByRole('columnheader', { name: 'Month' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Projected income' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Budget status' })).toBeInTheDocument()
    expect(screen.getByText('Near budget')).toBeInTheDocument()
    expect(screen.getByText('No budget')).toBeInTheDocument()
    expect(screen.getAllByText('$4,000.00')).toHaveLength(2)
    expect(screen.getByText('$4,300.00')).toBeInTheDocument()
    expect(screen.getByText('-$300.00')).toBeInTheDocument()
  })

  it('shows an empty-range message when no entries exist', async () => {
    vi.mocked(reportsApi.getMonthlyComparison).mockResolvedValue({
      ...sampleComparison,
      months: sampleComparison.months.map((month) => ({
        ...month,
        incomeCount: 0,
        expenseCount: 0,
      })),
    })

    renderPage()

    expect(
      await screen.findByText(/No income or expense entries in this range/i),
    ).toBeInTheDocument()
  })

  it('shows Retry when the API is unavailable', async () => {
    const user = userEvent.setup()
    vi.mocked(reportsApi.getMonthlyComparison)
      .mockRejectedValueOnce(new ApiClientError({ message: 'down', code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce(sampleComparison)

    renderPage()

    expect(await screen.findByText('Unable to load trends. Please try again.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('$4,300.00')).toBeInTheDocument()
  })

  it('shows a validation error for a range that is too large', async () => {
    vi.mocked(reportsApi.getMonthlyComparison).mockRejectedValue(
      new ApiClientError({
        message: 'Requested report range spans 30 months; max is 24 months',
        code: 'REPORT_RANGE_TOO_LARGE',
        status: 400,
      }),
    )

    renderPage()

    expect(
      await screen.findByText('Requested report range spans 30 months; max is 24 months'),
    ).toBeInTheDocument()
  })

  it('applies a new range from the form', async () => {
    const user = userEvent.setup()
    vi.mocked(reportsApi.getMonthlyComparison).mockResolvedValue(sampleComparison)

    renderPage()
    await screen.findByText('$4,300.00')

    await user.selectOptions(screen.getByLabelText('Start year'), '2025')
    await user.selectOptions(screen.getByLabelText('Start month'), '1')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(reportsApi.getMonthlyComparison).toHaveBeenLastCalledWith(
      expect.objectContaining({ startYear: 2025, startMonth: 1 }),
      expect.any(AbortSignal),
    )
  })

  it('shows a form error when the start period is after the end period', async () => {
    const user = userEvent.setup()
    vi.mocked(reportsApi.getMonthlyComparison).mockResolvedValue(sampleComparison)

    renderPage()
    await screen.findByText('$4,300.00')

    await user.selectOptions(screen.getByLabelText('Start month'), '12')
    await user.selectOptions(screen.getByLabelText('Start year'), '2030')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByText('Start period must not be after the end period.')).toBeInTheDocument()
  })
})
