import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import { CategoryForm } from './CategoryForm'

describe('CategoryForm', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders the create form', () => {
    render(
      <CategoryForm
        mode="create"
        initialValues={{ name: '', description: '', color: '', budgetGroup: '' }}
        submitting={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Add category' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
  })

  it('rejects a blank name', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <CategoryForm
        mode="create"
        initialValues={{ name: '   ', description: '', color: '', budgetGroup: 'GROCERIES' }}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create category' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Name is required')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a name longer than 80 characters', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <CategoryForm
        mode="create"
        initialValues={{ name: 'a'.repeat(81), description: '', color: '', budgetGroup: 'GROCERIES' }}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create category' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Name must be at most 80 characters',
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a description longer than 255 characters', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <CategoryForm
        mode="create"
        initialValues={{ name: 'Travel', description: 'd'.repeat(256), color: '', budgetGroup: 'GROCERIES' }}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Create category' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Description must be at most 255 characters',
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits valid create values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <CategoryForm
        mode="create"
        initialValues={{ name: '', description: '', color: '', budgetGroup: '' }}
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Name'), '  Groceries  ')
    await user.type(screen.getByLabelText('Description'), ' Food ')
    await user.selectOptions(screen.getByLabelText('Budget group'), 'GROCERIES')
    await user.click(screen.getByRole('button', { name: 'Create category' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: '  Groceries  ',
        description: ' Food ',
        color: '',
        budgetGroup: 'GROCERIES',
      })
    })
  })

  it('displays a duplicate-name backend error on the name field', () => {
    render(
      <CategoryForm
        mode="create"
        initialValues={{ name: 'Groceries', description: '', color: '', budgetGroup: 'GROCERIES' }}
        submitting={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        serverErrors={{
          name: new ApiClientError({
            message: "A category with name 'Groceries' already exists",
            code: 'CATEGORY_NAME_ALREADY_EXISTS',
            status: 409,
          }).message,
        }}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      "A category with name 'Groceries' already exists",
    )
  })

  it('disables the submit button while saving', () => {
    render(
      <CategoryForm
        mode="create"
        initialValues={{ name: 'Travel', description: '', color: '', budgetGroup: 'GROCERIES' }}
        submitting
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled()
  })
})
