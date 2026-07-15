import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import { IncomeForm } from './IncomeForm'

const emptyValues = {
  description: '',
  source: '',
  amount: '',
  incomeDate: '',
  notes: '',
}

describe('IncomeForm', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders the create form', () => {
    render(
      <IncomeForm
        mode="create"
        initialValues={emptyValues}
        submitting={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Add income' })).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Source')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    expect(screen.getByLabelText('Income date')).toBeInTheDocument()
  })

  it('rejects a blank description', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <IncomeForm
        mode="create"
        initialValues={{ ...emptyValues, description: '   ' }}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create income' }))
    expect(screen.getByText('Description is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a blank source', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <IncomeForm
        mode="create"
        initialValues={{ ...emptyValues, description: 'Paycheck' }}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create income' }))
    expect(screen.getByText('Source is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a source that is too long', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <IncomeForm
        mode="create"
        initialValues={{ ...emptyValues, description: 'Paycheck', source: 'a'.repeat(121) }}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create income' }))
    expect(screen.getByText('Source must be at most 120 characters')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects an invalid amount', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <IncomeForm
        mode="create"
        initialValues={{ ...emptyValues, description: 'Paycheck', source: 'Employer', amount: '0' }}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create income' }))
    expect(screen.getByText('Amount must be greater than zero')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('requires an income date', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <IncomeForm
        mode="create"
        initialValues={{
          ...emptyValues,
          description: 'Paycheck',
          source: 'Employer',
          amount: '1200.00',
        }}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create income' }))
    expect(screen.getByText('Income date is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits valid create values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <IncomeForm
        mode="create"
        initialValues={emptyValues}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Description'), '  Paycheck  ')
    await user.type(screen.getByLabelText('Source'), 'Employer')
    await user.type(screen.getByLabelText('Amount'), '1200.00')
    await user.type(screen.getByLabelText('Income date'), '2026-07-10')
    await user.click(screen.getByRole('button', { name: 'Create income' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        description: '  Paycheck  ',
        source: 'Employer',
        amount: '1200.00',
        incomeDate: '2026-07-10',
        notes: '',
      })
    })
  })

  it('displays backend validation errors', () => {
    render(
      <IncomeForm
        mode="create"
        initialValues={{ ...emptyValues, description: 'Paycheck' }}
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
    render(
      <IncomeForm
        mode="create"
        initialValues={{ ...emptyValues, description: 'Paycheck' }}
        submitting
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled()
  })
})
