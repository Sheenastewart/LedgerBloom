import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

function renderHome() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <HomePage />
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

  it('shows API connected and financial links when the health request succeeds and the user is authenticated', async () => {
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

    renderHome()

    expect(screen.getByTestId('health-status')).toHaveTextContent(
      'Checking API connection...',
    )

    await waitFor(() => {
      expect(screen.getByTestId('health-status')).toHaveTextContent('API connected')
    })
    expect(await screen.findByRole('link', { name: 'View dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    )
    expect(screen.getByRole('link', { name: 'Manage transactions' })).toHaveAttribute(
      'href',
      '/transactions',
    )
    expect(screen.getByRole('link', { name: 'Manage budgets' })).toHaveAttribute(
      'href',
      '/budgets',
    )
    expect(screen.getByRole('link', { name: 'View reports' })).toHaveAttribute(
      'href',
      '/reports',
    )
    expect(screen.getByRole('link', { name: 'Open settings' })).toHaveAttribute(
      'href',
      '/settings',
    )
    expect(screen.getByRole('link', { name: 'View help' })).toHaveAttribute('href', '/settings/help')
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
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

    renderHome()

    expect(await screen.findByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/register',
    )
    expect(screen.queryByRole('link', { name: 'View dashboard' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View help' })).toHaveAttribute('href', '/settings/help')
  })

  it('shows API unavailable when the health request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    vi.mocked(authApi.getMe).mockRejectedValue(
      new ApiClientError({ message: 'Authentication required', code: 'UNAUTHORIZED', status: 401 }),
    )

    renderHome()

    await waitFor(() => {
      expect(screen.getByTestId('health-status')).toHaveTextContent('API unavailable')
    })
  })
})
