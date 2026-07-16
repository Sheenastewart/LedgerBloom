import { ApiClientError, requestJson } from '../../../api/apiClient'
import type {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  ResetPasswordRequest,
  User,
} from '../types'

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

export async function forgotPassword(body: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
  return requestJson<ForgotPasswordResponse>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function resetPassword(body: ResetPasswordRequest): Promise<MessageResponse> {
  return requestJson<MessageResponse>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export { ApiClientError }
