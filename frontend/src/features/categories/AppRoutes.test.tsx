import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../../App'
import * as categoryApi from './api/categoryApi'

vi.mock('../../api/health', () => ({
  fetchHealth: vi.fn().mockResolvedValue({ status: 'UP', service: 'ledgerbloom-api' }),
}))

vi.mock('./api/categoryApi', () => ({
  getCategories: vi.fn().mockResolvedValue([]),
  getCategory: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}))

describe('Category routes', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(categoryApi.getCategories).mockResolvedValue([])
  })

  it('navigates between Home and Categories without a full page reload', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'LedgerBloom' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Categories' }))
    expect(await screen.findByRole('heading', { name: 'Categories' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('heading', { name: 'LedgerBloom' })).toBeInTheDocument()
  })

  it('renders Add category from the Categories page', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/categories']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Categories' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('link', { name: 'Add category' })[0])
    expect(await screen.findByRole('heading', { name: 'Add category' })).toBeInTheDocument()
  })

  it('shows not found for an invalid edit id', async () => {
    render(
      <MemoryRouter initialEntries={['/categories/0/edit']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Category not found' })).toBeInTheDocument()
    expect(categoryApi.getCategory).not.toHaveBeenCalled()
  })
})
