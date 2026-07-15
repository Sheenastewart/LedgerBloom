import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'

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

    render(<HomePage />)

    expect(screen.getByTestId('health-status')).toHaveTextContent(
      'Checking API connection...',
    )

    await waitFor(() => {
      expect(screen.getByTestId('health-status')).toHaveTextContent('API connected')
    })
  })

  it('shows API unavailable when the health request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByTestId('health-status')).toHaveTextContent('API unavailable')
    })
  })
})
