import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import { ExpenseForm } from './ExpenseForm'

const sampleCategories = [
  {
    id: 1,
    name: 'Groceries',
    description: null,
    color: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

const emptyValues = {
  description: '',
  merchant: '',
  amount: '',
  expenseDate: '',
  categoryId: '',
  notes: '',
}


function renderForm(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('ExpenseForm', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders the create form', () => {
    renderForm(
      <ExpenseForm
        mode="create"
        initialValues={emptyValues}
        categories={sampleCategories}
        submitting={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Add expense' })).toBeInTheDocument()
    expect(screen.getByLabelText('Category')).toBeInTheDocument()
    expect(screen.getByLabelText('Merchant')).toBeInTheDocument()
    expect(screen.getByLabelText('Payment source')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    expect(screen.getByLabelText('Expense date')).toBeInTheDocument()
  })

  it('shows a no-category state', () => {
    renderForm(
      <ExpenseForm
          mode="create"
          initialValues={emptyValues}
          categories={[]}
          submitting={false}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
    )

    expect(screen.getByText(/Create at least one category/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add category' })).toHaveAttribute(
      'href',
      '/budgets/categories/new',
    )
  })

  it('allows a blank payment source when category is not Other', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm(
      <ExpenseForm
        mode="create"
        initialValues={{
          ...emptyValues,
          description: '',
          amount: '12.50',
          expenseDate: '2026-07-10',
          categoryId: '1',
        }}
        categories={sampleCategories}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create expense' }))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
  })

  it('requires merchant when category is Other', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm(
      <ExpenseForm
        mode="create"
        initialValues={{
          ...emptyValues,
          description: '',
          merchant: '',
          amount: '12.50',
          expenseDate: '2026-07-10',
          categoryId: '2',
        }}
        categories={[
          ...sampleCategories,
          {
            id: 2,
            name: 'Other',
            description: null,
            color: null,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
        ]}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create expense' }))
    expect(screen.getByText('Merchant is required when category is Other')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects an invalid amount', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm(
      <ExpenseForm
        mode="create"
        initialValues={{ ...emptyValues, amount: '0' }}
        categories={sampleCategories}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create expense' }))
    expect(screen.getByText('Amount must be greater than zero')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects more than two decimal places', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm(
      <ExpenseForm
        mode="create"
        initialValues={{ ...emptyValues, amount: '12.345' }}
        categories={sampleCategories}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create expense' }))
    expect(screen.getByText('Amount can have at most 2 decimal places')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects an amount that is too large', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm(
      <ExpenseForm
        mode="create"
        initialValues={{ ...emptyValues, amount: '12345678901' }}
        categories={sampleCategories}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create expense' }))
    expect(
      screen.getByText('Amount can have at most 10 digits before the decimal'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('requires an expense date', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm(
      <ExpenseForm
        mode="create"
        initialValues={{ ...emptyValues, description: 'Lunch', amount: '12.50', categoryId: '1' }}
        categories={sampleCategories}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create expense' }))
    expect(screen.getByText('Expense date is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('requires a category', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm(
      <ExpenseForm
        mode="create"
        initialValues={{
          ...emptyValues,
          description: 'Lunch',
          amount: '12.50',
          expenseDate: '2026-07-10',
        }}
        categories={sampleCategories}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create expense' }))
    expect(screen.getByText('Category is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits valid create values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm(
      <ExpenseForm
        mode="create"
        initialValues={emptyValues}
        categories={sampleCategories}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Payment source'), '  Lunch  ')
    await user.type(screen.getByLabelText('Amount'), '12.50')
    await user.type(screen.getByLabelText('Expense date'), '2026-07-10')
    await user.selectOptions(screen.getByLabelText('Category'), '1')
    await user.click(screen.getByRole('button', { name: 'Create expense' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        description: '  Lunch  ',
        merchant: '',
        amount: '12.50',
        expenseDate: '2026-07-10',
        categoryId: '1',
        notes: '',
      })
    })
  })

  it('displays backend validation errors', () => {
    renderForm(
      <ExpenseForm
        mode="create"
        initialValues={{ ...emptyValues, description: 'Lunch' }}
        categories={sampleCategories}
        submitting={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        serverErrors={{
          amount: new ApiClientError({
            message: 'Amount must be greater than zero',
            code: 'VALIDATION_FAILED',
            status: 400,
          }).message,
        }}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Amount must be greater than zero')
  })

  it('disables submit while saving', () => {
    renderForm(
      <ExpenseForm
        mode="create"
        initialValues={{ ...emptyValues, description: 'Lunch' }}
        categories={sampleCategories}
        submitting
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled()
  })
})
