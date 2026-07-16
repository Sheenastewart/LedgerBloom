import { requestJson } from '../../../api/apiClient'
import type { User } from '../../auth/types'
import type { ChangePasswordRequest, UpdateProfileRequest } from '../types'

export async function getAccount(signal?: AbortSignal): Promise<User> {
  return requestJson<User>('/api/account', { method: 'GET', signal })
}

export async function updateProfile(body: UpdateProfileRequest): Promise<User> {
  return requestJson<User>('/api/account/profile', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function changePassword(body: ChangePasswordRequest): Promise<User> {
  return requestJson<User>('/api/account/password', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}
