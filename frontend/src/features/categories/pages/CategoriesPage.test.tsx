import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import * as categoryApi from '../api/categoryApi'
import { CategoriesPage } from './CategoriesPage'

vi.mock('../api/categoryApi', () => ({
  getCategories: vi.fn(),
  deleteCategory: vi.fn(),
  addStarterCategories: vi.fn(),
}))

const sampleCategories = [
  {
    id: 1,
    name: 'bills',
    description: 'Utilities',
    color: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Housing',
    description: null,
    color: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

function renderPage(initialEntry = '/budgets/categories') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/budgets/categories" element={<CategoriesPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CategoriesPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(categoryApi.getCategories).mockReset()
    vi.mocked(categoryApi.deleteCategory).mockReset()
    vi.mocked(categoryApi.addStarterCategories).mockReset()
  })

  it('shows a loading state while categories load', () => {
    vi.mocked(categoryApi.getCategories).mockReturnValue(new Promise(() => undefined))
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Loading categories…')
  })

  it('renders categories from the API', async () => {
    vi.mocked(categoryApi.getCategories).mockResolvedValue(sampleCategories)
    renderPage()

    expect(await screen.findByRole('heading', { name: 'bills' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Housing' })).toBeInTheDocument()
    expect(screen.getByText('Utilities')).toBeInTheDocument()
  })

  it('shows an empty state when there are no categories', async () => {
    vi.mocked(categoryApi.getCategories).mockResolvedValue([])
    renderPage()

    expect(
      await screen.findByText(/No categories yet/i),
    ).toBeInTheDocument()
  })

  it('shows an error state and retries', async () => {
    const user = userEvent.setup()
    vi.mocked(categoryApi.getCategories)
      .mockRejectedValueOnce(new ApiClientError({ message: 'down', code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce(sampleCategories)

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(/Unable to load categories/i)
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: 'bills' })).toBeInTheDocument()
    expect(categoryApi.getCategories).toHaveBeenCalledTimes(2)
  })

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup()
    vi.mocked(categoryApi.getCategories).mockResolvedValue(sampleCategories)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPage()

    await screen.findByRole('heading', { name: 'bills' })
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    expect(categoryApi.deleteCategory).not.toHaveBeenCalled()
  })

  it('deletes a category after confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(categoryApi.getCategories).mockResolvedValue(sampleCategories)
    vi.mocked(categoryApi.deleteCategory).mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()

    await screen.findByRole('heading', { name: 'bills' })
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    await waitFor(() => {
      expect(categoryApi.deleteCategory).toHaveBeenCalledWith(1)
    })
    expect(screen.queryByRole('heading', { name: 'bills' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Deleted category "bills"/i)
  })

  it('shows an error when deletion fails', async () => {
    const user = userEvent.setup()
    vi.mocked(categoryApi.getCategories).mockResolvedValue(sampleCategories)
    vi.mocked(categoryApi.deleteCategory).mockRejectedValue(
      new ApiClientError({ message: 'nope', code: 'UNEXPECTED_ERROR' }),
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()

    await screen.findByRole('heading', { name: 'bills' })
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not delete "bills"/i)
    expect(screen.getByRole('heading', { name: 'bills' })).toBeInTheDocument()
  })

  it('shows create success message from navigation state', async () => {
    vi.mocked(categoryApi.getCategories).mockResolvedValue([])
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/budgets/categories',
            state: { successMessage: 'Created category "Travel".' },
          },
        ]}
      >
        <Routes>
          <Route path="/budgets/categories" element={<CategoriesPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('Created category "Travel".'),
    ).toBeInTheDocument()
  })

  it('does not add starter categories when confirmation is cancelled', async () => {
    const user = userEvent.setup()
    vi.mocked(categoryApi.getCategories).mockResolvedValue([])
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPage()

    await screen.findByText(/No categories yet/i)
    await user.click(screen.getAllByRole('button', { name: 'Add starter categories' })[0])
    expect(categoryApi.addStarterCategories).not.toHaveBeenCalled()
  })

  it('adds starter categories after confirmation and refreshes the list', async () => {
    const user = userEvent.setup()
    vi.mocked(categoryApi.getCategories)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(sampleCategories)
    vi.mocked(categoryApi.addStarterCategories).mockResolvedValue({
      createdCount: 27,
      createdNames: ['Housing', 'Utilities'],
      skippedCount: 0,
      skippedNames: [],
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()

    await screen.findByText(/No categories yet/i)
    await user.click(screen.getAllByRole('button', { name: 'Add starter categories' })[0])

    await waitFor(() => {
      expect(categoryApi.addStarterCategories).toHaveBeenCalledTimes(1)
    })
    expect(await screen.findByRole('heading', { name: 'bills' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Added 27 starter categories/i)
    expect(categoryApi.getCategories).toHaveBeenCalledTimes(2)
  })

  it('reports when starter categories already exist', async () => {
    const user = userEvent.setup()
    vi.mocked(categoryApi.getCategories).mockResolvedValue(sampleCategories)
    vi.mocked(categoryApi.addStarterCategories).mockResolvedValue({
      createdCount: 0,
      createdNames: [],
      skippedCount: 27,
      skippedNames: ['Housing'],
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()

    await screen.findByRole('heading', { name: 'bills' })
    await user.click(screen.getByRole('button', { name: 'Add starter categories' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      /All starter categories already exist/i,
    )
  })

  it('shows an error when adding starter categories fails', async () => {
    const user = userEvent.setup()
    vi.mocked(categoryApi.getCategories).mockResolvedValue(sampleCategories)
    vi.mocked(categoryApi.addStarterCategories).mockRejectedValue(
      new ApiClientError({ message: 'nope', code: 'UNEXPECTED_ERROR' }),
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()

    await screen.findByRole('heading', { name: 'bills' })
    await user.click(screen.getByRole('button', { name: 'Add starter categories' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Unable to add starter categories/i,
    )
  })
})
