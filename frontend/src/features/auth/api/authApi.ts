import { ApiClientError, requestJson } from '../../../api/apiClient'
import type { LoginRequest, RegisterRequest, User } from '../types'

export async function register(body: RegisterRequest): Promise<User> {
  return requestJson<User>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function login(body: LoginRequest): Promise<User> {
  return requestJson<User>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function logout(): Promise<void> {
  await requestJson<void>('/api/auth/logout', { method: 'POST' })
}

export async function getMe(signal?: AbortSignal): Promise<User> {
  return requestJson<User>('/api/auth/me', { method: 'GET', signal })
}

export { ApiClientError }
