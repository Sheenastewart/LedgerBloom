import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shows API connected when the health request succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'UP', service: 'ledgerbloom-api' }),
      }),
    )

    renderHome()

    expect(screen.getByTestId('health-status')).toHaveTextContent(
      'Checking API connection...',
    )

    await waitFor(() => {
      expect(screen.getByTestId('health-status')).toHaveTextContent('API connected')
    })
    expect(screen.getByRole('link', { name: 'Manage categories' })).toHaveAttribute(
      'href',
      '/categories',
    )
  })

  it('shows API unavailable when the health request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    renderHome()

    await waitFor(() => {
      expect(screen.getByTestId('health-status')).toHaveTextContent('API unavailable')
    })
  })
})