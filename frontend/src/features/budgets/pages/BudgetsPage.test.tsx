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
  generateMonthlyBudget: vi.fn(),
  createGroupLimit: vi.fn(),
  updateGroupLimit: vi.fn(),
  deleteGroupLimit: vi.fn(),
  restoreDefaultGroupLimits: vi.fn(),
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
  userModified: false,
  groupLimits: [
    {
      id: 50,
      group: { key: 'GROCERIES', label: 'Groceries' },
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
        <Route path="/budgets/monthly" element={<BudgetsPage />} />
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
    vi.mocked(budgetApi.generateMonthlyBudget).mockReset()
    vi.mocked(budgetApi.deleteMonthlyBudget).mockReset()
    vi.mocked(budgetApi.createGroupLimit).mockReset()
    vi.mocked(budgetApi.updateGroupLimit).mockReset()
    vi.mocked(budgetApi.deleteGroupLimit).mockReset()
    vi.mocked(budgetApi.restoreDefaultGroupLimits).mockReset()
    vi.mocked(categoryApi.getCategories).mockResolvedValue([
      { id: 1, name: 'Groceries', description: null, color: null, createdAt: '', updatedAt: '' },
      { id: 2, name: 'Utilities', description: null, color: null, createdAt: '', updatedAt: '' },
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
    expect(screen.getByRole('button', { name: 'Add group limit' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Manage categories' })).toBeInTheDocument()
  })

  it('shows no-budget state with create action', async () => {
    vi.mocked(budgetApi.getMonthlyBudget).mockRejectedValue(
      new ApiClientError({ message: 'missing', code: 'BUDGET_NOT_FOUND', status: 404 }),
    )
    vi.mocked(budgetApi.generateMonthlyBudget).mockRejectedValue(
      new ApiClientError({
        message: 'No recurring income or bills',
        code: 'INVALID_BUDGET_DATA',
        status: 400,
      }),
    )

    renderPage()

    expect(await screen.findByText(/No budget set for July 2026/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Set up group budgets' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Create manually' })).toBeInTheDocument()
    expect(budgetApi.generateMonthlyBudget).toHaveBeenCalledWith({ year: 2026, month: 7 })
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
    vi.mocked(budgetApi.generateMonthlyBudget).mockRejectedValue(
      new ApiClientError({
        message: 'No recurring income or bills',
        code: 'INVALID_BUDGET_DATA',
        status: 400,
      }),
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

  it('adds a group limit', async () => {
    const user = userEvent.setup()
    vi.mocked(budgetApi.getMonthlyBudget).mockResolvedValue({
      ...sampleBudget,
      groupLimits: [],
    })
    vi.mocked(budgetApi.createGroupLimit).mockResolvedValue(sampleBudget)

    renderPage()
    await screen.findByText('No group limits for this month.')

    await user.click(screen.getByRole('button', { name: 'Add group limit' }))
    await user.selectOptions(screen.getByLabelText('Budget group'), 'GROCERIES')
    await user.type(screen.getByLabelText('Limit amount'), '300.00')
    await user.type(screen.getByLabelText('Assistance amount'), '150.00')
    await user.click(screen.getByRole('button', { name: 'Save group limit' }))

    await waitFor(() => {
      expect(budgetApi.createGroupLimit).toHaveBeenCalledWith(10, {
        budgetGroup: 'GROCERIES',
        limitAmount: 300,
        assistanceAmount: 150,
      })
    })
  })

  it('restores missing default budget groups after confirmation', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(budgetApi.getMonthlyBudget).mockResolvedValue(sampleBudget)
    vi.mocked(budgetApi.restoreDefaultGroupLimits).mockResolvedValue({
      budget: {
        ...sampleBudget,
        groupLimits: [
          ...sampleBudget.groupLimits,
          {
            id: 51,
            group: { key: 'BILLS', label: 'Bills' },
            limitAmount: 2000,
            assistanceAmount: 0,
            actualSpent: 0,
            budgetableSpent: 0,
            remaining: 2000,
            percentUsed: 0,
            overBudget: false,
          },
        ],
      },
      restored: [{ key: 'BILLS', label: 'Bills' }],
      skipped: [{ key: 'GROCERIES', label: 'Groceries' }],
    })

    renderPage()
    await screen.findByText('$1,000.00')
    await user.click(screen.getByRole('button', { name: 'Restore default budget groups' }))

    await waitFor(() => {
      expect(budgetApi.restoreDefaultGroupLimits).toHaveBeenCalledWith(10)
    })
    expect(await screen.findByText(/Restored 1 group: Bills/)).toBeInTheDocument()
    expect(screen.getByText(/Left 1 existing group unchanged/)).toBeInTheDocument()
    confirmSpy.mockRestore()
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

  it('shows duplicate group limit errors', async () => {
    const user = userEvent.setup()
    vi.mocked(budgetApi.getMonthlyBudget).mockResolvedValue({
      ...sampleBudget,
      groupLimits: [],
    })
    vi.mocked(budgetApi.createGroupLimit).mockRejectedValue(
      new ApiClientError({
        message: 'A budget group limit already exists',
        code: 'BUDGET_GROUP_ALREADY_EXISTS',
        status: 409,
      }),
    )

    renderPage()
    await screen.findByText('No group limits for this month.')
    await user.click(screen.getByRole('button', { name: 'Add group limit' }))
    await user.selectOptions(screen.getByLabelText('Budget group'), 'GROCERIES')
    await user.type(screen.getByLabelText('Limit amount'), '300.00')
    await user.click(screen.getByRole('button', { name: 'Save group limit' }))

    expect(await screen.findByText('A budget group limit already exists')).toBeInTheDocument()
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
