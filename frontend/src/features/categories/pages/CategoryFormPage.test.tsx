import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import * as categoryApi from '../api/categoryApi'
import { CategoryFormPage } from './CategoryFormPage'

vi.mock('../api/categoryApi', () => ({
  getCategory: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
}))

function renderEdit(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/budgets/categories/:id/edit" element={<CategoryFormPage mode="edit" />} />
        <Route path="/budgets/categories" element={<p>Categories home</p>} />
        <Route path="/budgets/categories/new" element={<CategoryFormPage mode="create" />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CategoryFormPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(categoryApi.getCategory).mockReset()
    vi.mocked(categoryApi.createCategory).mockReset()
    vi.mocked(categoryApi.updateCategory).mockReset()
  })

  it('loads an existing category for edit', async () => {
    vi.mocked(categoryApi.getCategory).mockResolvedValue({
      id: 7,
      name: 'Housing',
      description: 'Rent',
      color: null,
      budgetGroup: 'BILLS',
      budgetGroupLabel: 'Bills',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })

    renderEdit('/budgets/categories/7/edit')

    expect(await screen.findByDisplayValue('Housing')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Rent')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Edit category' })).toBeInTheDocument()
  })

  it('shows not-found for an invalid route id without calling the API', async () => {
    renderEdit('/budgets/categories/abc/edit')

    expect(await screen.findByRole('heading', { name: 'Category not found' })).toBeInTheDocument()
    expect(categoryApi.getCategory).not.toHaveBeenCalled()
  })

  it('shows not-found when the API returns 404', async () => {
    vi.mocked(categoryApi.getCategory).mockRejectedValue(
      new ApiClientError({ message: 'missing', code: 'CATEGORY_NOT_FOUND', status: 404 }),
    )

    renderEdit('/budgets/categories/99/edit')

    expect(await screen.findByRole('heading', { name: 'Category not found' })).toBeInTheDocument()
  })

  it('submits a successful update', async () => {
    const user = userEvent.setup()
    vi.mocked(categoryApi.getCategory).mockResolvedValue({
      id: 7,
      name: 'Housing',
      description: 'Rent',
      color: null,
      budgetGroup: 'BILLS',
      budgetGroupLabel: 'Bills',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })
    vi.mocked(categoryApi.updateCategory).mockResolvedValue({
      id: 7,
      name: 'Housing',
      description: 'Mortgage',
      color: null,
      budgetGroup: 'BILLS',
      budgetGroupLabel: 'Bills',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    })

    renderEdit('/budgets/categories/7/edit')
    await screen.findByDisplayValue('Housing')

    await user.clear(screen.getByLabelText('Description'))
    await user.type(screen.getByLabelText('Description'), 'Mortgage')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(categoryApi.updateCategory).toHaveBeenCalledWith(7, {
        name: 'Housing',
        description: 'Mortgage',
        color: null,
        budgetGroup: 'BILLS',
      })
    })
    expect(await screen.findByText('Categories home')).toBeInTheDocument()
  })

  it('creates a category successfully', async () => {
    const user = userEvent.setup()
    vi.mocked(categoryApi.createCategory).mockResolvedValue({
      id: 3,
      name: 'Travel',
      description: null,
      color: null,
      budgetGroup: 'EATING_OUT',
      budgetGroupLabel: 'Eating out',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })

    render(
      <MemoryRouter initialEntries={['/budgets/categories/new']}>
        <Routes>
          <Route path="/budgets/categories/new" element={<CategoryFormPage mode="create" />} />
          <Route path="/budgets/categories" element={<p>Categories home</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Name'), 'Travel')
    await user.selectOptions(screen.getByLabelText('Budget group'), 'EATING_OUT')
    await user.click(screen.getByRole('button', { name: 'Create category' }))

    await waitFor(() => {
      expect(categoryApi.createCategory).toHaveBeenCalledWith({
        name: 'Travel',
        description: null,
        color: null,
        budgetGroup: 'EATING_OUT',
      })
    })
    expect(await screen.findByText('Categories home')).toBeInTheDocument()
  })
})
