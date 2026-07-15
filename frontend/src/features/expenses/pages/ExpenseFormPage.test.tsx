import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import * as categoryApi from '../../categories/api/categoryApi'
import * as expenseApi from '../api/expenseApi'
import { ExpenseFormPage } from './ExpenseFormPage'

vi.mock('../api/expenseApi', () => ({
  getExpense: vi.fn(),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
}))

vi.mock('../../categories/api/categoryApi', () => ({
  getCategories: vi.fn(),
}))

const sampleCategories = [
  {
    id: 1,
    name: 'Groceries',
    description: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={['/expenses/new']}>
      <Routes>
        <Route path="/expenses/new" element={<ExpenseFormPage mode="create" />} />
        <Route path="/expenses" element={<p>Expenses home</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderEdit(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/expenses/:id/edit" element={<ExpenseFormPage mode="edit" />} />
        <Route path="/expenses" element={<p>Expenses home</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ExpenseFormPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(expenseApi.getExpense).mockReset()
    vi.mocked(expenseApi.createExpense).mockReset()
    vi.mocked(expenseApi.updateExpense).mockReset()
    vi.mocked(categoryApi.getCategories).mockReset()
    vi.mocked(categoryApi.getCategories).mockResolvedValue(sampleCategories)
  })

  it('loads categories for create', async () => {
    renderCreate()
    expect(await screen.findByRole('heading', { name: 'Add expense' })).toBeInTheDocument()
    expect(screen.getByLabelText('Category')).toBeInTheDocument()
  })

  it('shows no-category state on create', async () => {
    vi.mocked(categoryApi.getCategories).mockResolvedValue([])
    renderCreate()
    expect(await screen.findByText(/Create at least one category/i)).toBeInTheDocument()
  })

  it('creates an expense successfully', async () => {
    const user = userEvent.setup()
    vi.mocked(expenseApi.createExpense).mockResolvedValue({
      id: 3,
      description: 'Lunch',
      merchant: null,
      amount: 12.5,
      expenseDate: '2026-07-10',
      category: { id: 1, name: 'Groceries' },
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })

    renderCreate()
    await screen.findByRole('heading', { name: 'Add expense' })

    await user.type(screen.getByLabelText('Description'), 'Lunch')
    await user.type(screen.getByLabelText('Amount'), '12.50')
    await user.type(screen.getByLabelText('Expense date'), '2026-07-10')
    await user.selectOptions(screen.getByLabelText('Category'), '1')
    await user.click(screen.getByRole('button', { name: 'Create expense' }))

    await waitFor(() => {
      expect(expenseApi.createExpense).toHaveBeenCalledWith({
        description: 'Lunch',
        merchant: null,
        amount: 12.5,
        expenseDate: '2026-07-10',
        categoryId: 1,
        notes: null,
      })
    })
    expect(await screen.findByText('Expenses home')).toBeInTheDocument()
  })

  it('loads an existing expense for edit', async () => {
    vi.mocked(expenseApi.getExpense).mockResolvedValue({
      id: 7,
      description: 'Weekly shopping',
      merchant: 'Market',
      amount: 45.5,
      expenseDate: '2026-07-10',
      category: { id: 1, name: 'Groceries' },
      notes: 'july',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })

    renderEdit('/expenses/7/edit')

    expect(await screen.findByDisplayValue('Weekly shopping')).toBeInTheDocument()
    expect(screen.getByDisplayValue('45.5')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Edit expense' })).toBeInTheDocument()
  })

  it('shows not-found for an invalid route id without calling the API', async () => {
    renderEdit('/expenses/abc/edit')

    expect(await screen.findByRole('heading', { name: 'Expense not found' })).toBeInTheDocument()
    expect(expenseApi.getExpense).not.toHaveBeenCalled()
  })

  it('shows not-found when the API returns 404', async () => {
    vi.mocked(expenseApi.getExpense).mockRejectedValue(
      new ApiClientError({ message: 'missing', code: 'EXPENSE_NOT_FOUND', status: 404 }),
    )

    renderEdit('/expenses/99/edit')

    expect(await screen.findByRole('heading', { name: 'Expense not found' })).toBeInTheDocument()
  })

  it('submits a successful update', async () => {
    const user = userEvent.setup()
    vi.mocked(expenseApi.getExpense).mockResolvedValue({
      id: 7,
      description: 'Weekly shopping',
      merchant: 'Market',
      amount: 45.5,
      expenseDate: '2026-07-10',
      category: { id: 1, name: 'Groceries' },
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })
    vi.mocked(expenseApi.updateExpense).mockResolvedValue({
      id: 7,
      description: 'Weekly shopping',
      merchant: 'Supermarket',
      amount: 45.5,
      expenseDate: '2026-07-10',
      category: { id: 1, name: 'Groceries' },
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    })

    renderEdit('/expenses/7/edit')
    await screen.findByDisplayValue('Weekly shopping')

    await user.clear(screen.getByLabelText('Merchant'))
    await user.type(screen.getByLabelText('Merchant'), 'Supermarket')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(expenseApi.updateExpense).toHaveBeenCalledWith(7, {
        description: 'Weekly shopping',
        merchant: 'Supermarket',
        amount: 45.5,
        expenseDate: '2026-07-10',
        categoryId: 1,
        notes: null,
      })
    })
    expect(await screen.findByText('Expenses home')).toBeInTheDocument()
  })
})
