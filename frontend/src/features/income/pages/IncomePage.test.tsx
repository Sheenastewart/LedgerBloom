import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import * as incomeApi from '../api/incomeApi'
import { IncomePage } from './IncomePage'

vi.mock('../api/incomeApi', () => ({
  getIncomeEntries: vi.fn(),
  deleteIncomeEntry: vi.fn(),
}))

const sampleEntries = [
  {
    id: 1,
    description: 'Monthly paycheck',
    source: 'Employer',
    amount: 4500.5,
    incomeDate: '2026-07-10',
    notes: 'july',
    createdAt: '2026-07-15T20:04:25.859404Z',
    updatedAt: '2026-07-15T20:04:25.859404Z',
  },
  {
    id: 2,
    description: 'Freelance project',
    source: 'Acme Co',
    amount: 800,
    incomeDate: '2026-06-02',
    notes: null,
    createdAt: '2026-06-02T10:00:00Z',
    updatedAt: '2026-06-02T10:00:00Z',
  },
]

function renderPage(initialEntry = '/income') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/income" element={<IncomePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('IncomePage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(incomeApi.getIncomeEntries).mockReset()
    vi.mocked(incomeApi.deleteIncomeEntry).mockReset()
  })

  it('shows a loading state while income loads', () => {
    vi.mocked(incomeApi.getIncomeEntries).mockReturnValue(new Promise(() => undefined))
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Loading income…')
  })

  it('renders income entries from the API', async () => {
    vi.mocked(incomeApi.getIncomeEntries).mockResolvedValue(sampleEntries)
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Monthly paycheck' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Freelance project' })).toBeInTheDocument()
    expect(screen.getByText('Notes: july')).toBeInTheDocument()
  })

  it('shows an empty state when there are no income entries', async () => {
    vi.mocked(incomeApi.getIncomeEntries).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('No income entries yet.')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Add income' }).length).toBeGreaterThan(0)
  })

  it('shows filter empty copy when filters are active and nothing matches', async () => {
    const user = userEvent.setup()
    vi.mocked(incomeApi.getIncomeEntries)
      .mockResolvedValueOnce(sampleEntries)
      .mockResolvedValueOnce([])

    renderPage()
    await screen.findByRole('heading', { name: 'Monthly paycheck' })

    await user.type(screen.getByLabelText('Source'), 'Nonexistent')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(
      await screen.findByText('No income entries match the current filters.'),
    ).toBeInTheDocument()
  })

  it('shows an error state and retries, preserving filters', async () => {
    const user = userEvent.setup()
    vi.mocked(incomeApi.getIncomeEntries)
      .mockResolvedValueOnce(sampleEntries)
      .mockRejectedValueOnce(new ApiClientError({ message: 'down', code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce([sampleEntries[1]])

    renderPage()
    await screen.findByRole('heading', { name: 'Monthly paycheck' })

    await user.type(screen.getByLabelText('Source'), 'Acme Co')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Unable to load income entries/i)
    expect(incomeApi.getIncomeEntries).toHaveBeenLastCalledWith({ source: 'Acme Co' }, undefined)

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('heading', { name: 'Freelance project' })).toBeInTheDocument()
    expect(incomeApi.getIncomeEntries).toHaveBeenLastCalledWith({ source: 'Acme Co' }, undefined)
    expect(incomeApi.getIncomeEntries).toHaveBeenCalledTimes(3)
  })

  it('filters by month and year', async () => {
    const user = userEvent.setup()
    vi.mocked(incomeApi.getIncomeEntries)
      .mockResolvedValueOnce(sampleEntries)
      .mockResolvedValueOnce([sampleEntries[0]])

    renderPage()
    await screen.findByRole('heading', { name: 'Monthly paycheck' })

    await user.selectOptions(screen.getByLabelText('Month'), 'July')
    await user.clear(screen.getByLabelText('Year'))
    await user.type(screen.getByLabelText('Year'), '2026')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      expect(incomeApi.getIncomeEntries).toHaveBeenLastCalledWith(
        { year: 2026, month: 7 },
        undefined,
      )
    })
  })

  it('filters by source', async () => {
    const user = userEvent.setup()
    vi.mocked(incomeApi.getIncomeEntries)
      .mockResolvedValueOnce(sampleEntries)
      .mockResolvedValueOnce([sampleEntries[1]])

    renderPage()
    await screen.findByRole('heading', { name: 'Monthly paycheck' })

    await user.type(screen.getByLabelText('Source'), 'Acme Co')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      expect(incomeApi.getIncomeEntries).toHaveBeenLastCalledWith(
        { source: 'Acme Co' },
        undefined,
      )
    })
  })

  it('clears filters', async () => {
    const user = userEvent.setup()
    vi.mocked(incomeApi.getIncomeEntries)
      .mockResolvedValueOnce(sampleEntries)
      .mockResolvedValueOnce([sampleEntries[0]])
      .mockResolvedValueOnce(sampleEntries)

    renderPage()
    await screen.findByRole('heading', { name: 'Monthly paycheck' })

    await user.type(screen.getByLabelText('Source'), 'Employer')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    await user.click(screen.getByRole('button', { name: 'Clear' }))

    await waitFor(() => {
      expect(incomeApi.getIncomeEntries).toHaveBeenLastCalledWith({}, undefined)
    })
  })

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup()
    vi.mocked(incomeApi.getIncomeEntries).mockResolvedValue(sampleEntries)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPage()

    await screen.findByRole('heading', { name: 'Monthly paycheck' })
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    expect(incomeApi.deleteIncomeEntry).not.toHaveBeenCalled()
  })

  it('deletes an income entry after confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(incomeApi.getIncomeEntries)
      .mockResolvedValueOnce(sampleEntries)
      .mockResolvedValueOnce([sampleEntries[1]])
    vi.mocked(incomeApi.deleteIncomeEntry).mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()

    await screen.findByRole('heading', { name: 'Monthly paycheck' })
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    await waitFor(() => {
      expect(incomeApi.deleteIncomeEntry).toHaveBeenCalledWith(1)
    })
    expect(incomeApi.getIncomeEntries).toHaveBeenLastCalledWith({}, undefined)
    expect(screen.getByRole('status')).toHaveTextContent(/Deleted income entry "Monthly paycheck"/i)
  })

  it('shows an error when deletion fails', async () => {
    const user = userEvent.setup()
    vi.mocked(incomeApi.getIncomeEntries).mockResolvedValue(sampleEntries)
    vi.mocked(incomeApi.deleteIncomeEntry).mockRejectedValue(
      new ApiClientError({ message: 'nope', code: 'UNEXPECTED_ERROR' }),
    )
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()

    await screen.findByRole('heading', { name: 'Monthly paycheck' })
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not delete "Monthly paycheck"/i)
    expect(screen.getByRole('heading', { name: 'Monthly paycheck' })).toBeInTheDocument()
  })

  it('preserves active filters after delete', async () => {
    const user = userEvent.setup()
    vi.mocked(incomeApi.getIncomeEntries)
      .mockResolvedValueOnce(sampleEntries)
      .mockResolvedValueOnce([sampleEntries[0]])
      .mockResolvedValueOnce([sampleEntries[0]])
    vi.mocked(incomeApi.deleteIncomeEntry).mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()

    await screen.findByRole('heading', { name: 'Monthly paycheck' })
    await user.type(screen.getByLabelText('Source'), 'Employer')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    await waitFor(() => {
      expect(incomeApi.getIncomeEntries).toHaveBeenLastCalledWith({ source: 'Employer' }, undefined)
    })
  })

  it('shows create success message from navigation state', async () => {
    vi.mocked(incomeApi.getIncomeEntries).mockResolvedValue([])
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/income',
            state: { successMessage: 'Created income entry "Paycheck".' },
          },
        ]}
      >
        <Routes>
          <Route path="/income" element={<IncomePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Created income entry "Paycheck".')).toBeInTheDocument()
  })
})
