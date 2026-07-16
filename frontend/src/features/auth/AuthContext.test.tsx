import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../api/ApiClientError'
import * as authApi from './api/authApi'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('./api/authApi', () => ({
  getMe: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}))

const sampleUser = {
  id: 1,
  email: 'user@example.com',
  displayName: 'Jane Doe',
  createdAt: '2026-01-01T00:00:00Z',
  lastLoginAt: '2026-07-15T00:00:00Z',
}

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider })
}

describe('AuthContext', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads the current user on mount when getMe succeeds', async () => {
    vi.mocked(authApi.getMe).mockResolvedValue(sampleUser)

    const { result } = renderAuth()

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toEqual(sampleUser)
  })

  it('sets user to null when getMe fails (e.g. no active session)', async () => {
    vi.mocked(authApi.getMe).mockRejectedValue(
      new ApiClientError({ message: 'Authentication required', code: 'UNAUTHORIZED', status: 401 }),
    )

    const { result } = renderAuth()

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it('login sets the current user on success', async () => {
    vi.mocked(authApi.getMe).mockRejectedValue(
      new ApiClientError({ message: 'Authentication required', code: 'UNAUTHORIZED', status: 401 }),
    )
    vi.mocked(authApi.login).mockResolvedValue(sampleUser)

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.login({ email: 'user@example.com', password: 'supersecret' })
    })

    expect(result.current.user).toEqual(sampleUser)
    expect(authApi.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'supersecret',
    })
  })

  it('login rejects and leaves the user unset on invalid credentials', async () => {
    vi.mocked(authApi.getMe).mockRejectedValue(
      new ApiClientError({ message: 'Authentication required', code: 'UNAUTHORIZED', status: 401 }),
    )
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiClientError({ message: 'Invalid credentials', code: 'INVALID_CREDENTIALS', status: 401 }),
    )

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.login({ email: 'user@example.com', password: 'wrong' })
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })

    expect(result.current.user).toBeNull()
  })

  it('register creates the account then signs in', async () => {
    vi.mocked(authApi.getMe).mockRejectedValue(
      new ApiClientError({ message: 'Authentication required', code: 'UNAUTHORIZED', status: 401 }),
    )
    vi.mocked(authApi.register).mockResolvedValue(sampleUser)
    vi.mocked(authApi.login).mockResolvedValue(sampleUser)

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))

    let response
    await act(async () => {
      response = await result.current.register({
        email: 'user@example.com',
        password: 'supersecret',
        confirmPassword: 'supersecret',
        displayName: 'Jane Doe',
      })
    })

    expect(response).toEqual(sampleUser)
    expect(result.current.user).toEqual(sampleUser)
    expect(authApi.register).toHaveBeenCalled()
    expect(authApi.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'supersecret',
    })
  })

  it('logout clears the current user', async () => {
    vi.mocked(authApi.getMe).mockResolvedValue(sampleUser)
    vi.mocked(authApi.logout).mockResolvedValue(undefined)

    const { result } = renderAuth()
    await waitFor(() => expect(result.current.user).toEqual(sampleUser))

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(authApi.logout).toHaveBeenCalled()
  })
})
