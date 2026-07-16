import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import * as categoryApi from '../../categories/api/categoryApi'
import * as budgetApi from '../api/budgetApi'
import { BudgetsPage } from './BudgetsPage'

vi.mock('../api/budgetApi', () => ({
  getMonthlyBudget: vi.fn(),
  createMonthlyBudget: vi.fn(),
  updateMonthlyBudget: vi.fn(),
  deleteMonthlyBudget: vi.fn(),
  createCategoryLimit: vi.fn(),
  updateCategoryLimit: vi.fn(),
  deleteCategoryLimit: vi.fn(),
}))

vi.mock('../../categories/api/categoryApi', () => ({
  getCategories: vi.fn().mockResolvedValue([
    { id: 1, name: 'Groceries', description: null, createdAt: '', updatedAt: '' },
    { id: 2, name: 'Utilities', description: null, createdAt: '', updatedAt: '' },
  ]),
}))

const sampleBudget = {
  id: 10,
  year: 2026,
  month: 7,
  totalLimit: 1000,
  actualExpenses: 200,
  budgetableExpenses: 200,
  assistanceApplied: 0,
  remaining: 800,
  percentUsed: 20,
  overBudget: false,
  expenseCount: 2,
  categoryLimits: [
    {
      id: 50,
      category: { id: 1, name: 'Groceries' },
      limitAmount: 300,
      assistanceAmount: 0,
      actualSpent: 150,
      budgetableSpent: 150,
      remaining: 150,
      percentUsed: 50,
      overBudget: false,
    },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function renderPage(entry = '/budgets/monthly?year=2026&month=7') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/budgets/monthly" element={<BudgetsPage view="monthly" />} />
        <Route path="/budgets/categories" element={<BudgetsPage view="categories" />} />
        <Route path="/budgets/new" element={<p>Create form</p>} />
        <Route path="/budgets/:id/edit" element={<p>Edit form</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BudgetsPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(budgetApi.getMonthlyBudget).mockReset()
    vi.mocked(budgetApi.deleteMonthlyBudget).mockReset()
    vi.mocked(budgetApi.createCategoryLimit).mockReset()
    vi.mocked(budgetApi.updateCategoryLimit).mockReset()
    vi.mocked(budgetApi.deleteCategoryLimit).mockReset()
    vi.mocked(categoryApi.getCategories).mockResolvedValue([
      { id: 1, name: 'Groceries', description: null, createdAt: '', updatedAt: '' },
      { id: 2, name: 'Utilities', description: null, createdAt: '', updatedAt: '' },
    ])
  })

  it('loads an existing budget for the selected month', async () => {
    vi.mocked(budgetApi.getMonthlyBudget).mockResolvedValue(sampleBudget)

    renderPage()

    expect(screen.getByText('Loading budget…')).toBeInTheDocument()
    expect(await screen.findByText('Total budget')).toBeInTheDocument()
    expect(screen.getByText('$1,000.00')).toBeInTheDocument()
    expect(screen.getByText('$200.00')).toBeInTheDocument()
    expect(screen.getAllByText('On track').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Manage category limits' })).toBeInTheDocument()
  })

  it('shows no-budget state with create action', async () => {
    vi.mocked(budgetApi.getMonthlyBudget).mockRejectedValue(
      new ApiClientError({ message: 'missing', code: 'BUDGET_NOT_FOUND', status: 404 }),
    )

    renderPage()

    expect(await screen.findByText(/No budget set for July 2026/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Create budget' }).length).toBeGreaterThan(0)
  })

  it('shows Retry when the API is unavailable', async () => {
    const user = userEvent.setup()
    vi.mocked(budgetApi.getMonthlyBudget)
      .mockRejectedValueOnce(new ApiClientError({ message: 'down', code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce(sampleBudget)

    renderPage()

    expect(
      await screen.findByText('Unable to load the monthly budget. Please try again.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('$1,000.00')).toBeInTheDocument()
  })

  it('deletes a budget after confirmation', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(budgetApi.getMonthlyBudget)
      .mockResolvedValueOnce(sampleBudget)
      .mockRejectedValueOnce(
        new ApiClientError({ message: 'missing', code: 'BUDGET_NOT_FOUND', status: 404 }),
      )
    vi.mocked(budgetApi.deleteMonthlyBudget).mockResolvedValue(undefined)

    renderPage()
    await screen.findByText('$1,000.00')

    await user.click(screen.getByRole('button', { name: 'Delete budget' }))

    await waitFor(() => {
      expect(budgetApi.deleteMonthlyBudget).toHaveBeenCalledWith(10)
    })
    expect(await screen.findByText(/Deleted budget for July 2026/)).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it('cancels delete when confirmation is dismissed', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    vi.mocked(budgetApi.getMonthlyBudget).mockResolvedValue(sampleBudget)

    renderPage()
    await screen.findByText('$1,000.00')
    await user.click(screen.getByRole('button', { name: 'Delete budget' }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(budgetApi.deleteMonthlyBudget).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('adds a category limit', async () => {
    const user = userEvent.setup()
    vi.mocked(budgetApi.getMonthlyBudget).mockResolvedValue({
      ...sampleBudget,
      categoryLimits: [],
    })
    vi.mocked(budgetApi.createCategoryLimit).mockResolvedValue(sampleBudget)

    renderPage('/budgets/categories?year=2026&month=7')
    await screen.findByText('No category limits for this month.')

    await user.click(screen.getByRole('button', { name: 'Add category limit' }))
    await user.selectOptions(screen.getByLabelText('Category'), '1')
    await user.type(screen.getByLabelText('Limit amount'), '300.00')
    await user.type(screen.getByLabelText('Food assistance'), '150.00')
    await user.click(screen.getByRole('button', { name: 'Save category limit' }))

    await waitFor(() => {
      expect(budgetApi.createCategoryLimit).toHaveBeenCalledWith(10, {
        categoryId: 1,
        limitAmount: 300,
        assistanceAmount: 150,
      })
    })
  })

  it('shows food assistance coverage on the monthly budget summary', async () => {
    vi.mocked(budgetApi.getMonthlyBudget).mockResolvedValue({
      ...sampleBudget,
      actualExpenses: 300,
      budgetableExpenses: 100,
      assistanceApplied: 200,
      remaining: 900,
      percentUsed: 10,
    })

    renderPage()

    expect(await screen.findByText('Counts toward budget')).toBeInTheDocument()
    expect(screen.getByText(/\$200\.00 covered by food assistance/i)).toBeInTheDocument()
  })

  it('shows duplicate category limit errors', async () => {
    const user = userEvent.setup()
    vi.mocked(budgetApi.getMonthlyBudget).mockResolvedValue({
      ...sampleBudget,
      categoryLimits: [],
    })
    vi.mocked(budgetApi.createCategoryLimit).mockRejectedValue(
      new ApiClientError({
        message: 'A category budget limit already exists',
        code: 'CATEGORY_BUDGET_ALREADY_EXISTS',
        status: 409,
      }),
    )

    renderPage('/budgets/categories?year=2026&month=7')
    await screen.findByText('No category limits for this month.')
    await user.click(screen.getByRole('button', { name: 'Add category limit' }))
    await user.selectOptions(screen.getByLabelText('Category'), '1')
    await user.type(screen.getByLabelText('Limit amount'), '300.00')
    await user.click(screen.getByRole('button', { name: 'Save category limit' }))

    expect(await screen.findByText('A category budget limit already exists')).toBeInTheDocument()
  })

  it('updates report when month selection changes', async () => {
    const user = userEvent.setup()
    vi.mocked(budgetApi.getMonthlyBudget)
      .mockResolvedValueOnce(sampleBudget)
      .mockResolvedValueOnce({ ...sampleBudget, month: 6 })

    renderPage()
    await screen.findByText('$1,000.00')

    await user.selectOptions(screen.getByLabelText('Month'), '6')
    await user.click(screen.getByRole('button', { name: 'Load budget' }))

    await waitFor(() => {
      expect(budgetApi.getMonthlyBudget).toHaveBeenLastCalledWith(
        { year: 2026, month: 6 },
        expect.any(AbortSignal),
      )
    })
  })
})
