import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../api/ApiClientError'
import { AuthProvider } from '../features/auth/AuthContext'
import * as authApi from '../features/auth/api/authApi'
import { HomePage } from './HomePage'

vi.mock('../features/auth/api/authApi', () => ({
  getMe: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}))

function renderHomeWithAuth(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<main>Dashboard destination</main>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('redirects authenticated users to the dashboard', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'UP', service: 'ledgerbloom-api' }),
      }),
    )
    vi.mocked(authApi.getMe).mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      displayName: 'Jane Doe',
      createdAt: '2026-01-01T00:00:00Z',
      lastLoginAt: '2026-07-15T00:00:00Z',
    })

    renderHomeWithAuth()

    expect(await screen.findByText('Dashboard destination')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'LedgerBloom' })).not.toBeInTheDocument()
  })

  it('shows login and register CTAs when logged out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'UP', service: 'ledgerbloom-api' }),
      }),
    )
    vi.mocked(authApi.getMe).mockRejectedValue(
      new ApiClientError({ message: 'Authentication required', code: 'UNAUTHORIZED', status: 401 }),
    )

    renderHomeWithAuth()

    expect(await screen.findByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/register',
    )
    expect(screen.getByRole('link', { name: 'View help' })).toHaveAttribute('href', '/settings/help')
  })

  it('shows API unavailable when the health request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    vi.mocked(authApi.getMe).mockRejectedValue(
      new ApiClientError({ message: 'Authentication required', code: 'UNAUTHORIZED', status: 401 }),
    )

    renderHomeWithAuth()

    await waitFor(() => {
      expect(screen.getByTestId('health-status')).toHaveTextContent('API unavailable')
    })
  })
})
