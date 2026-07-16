import type { User } from '../auth/types'

export type UpdateProfileRequest = {
  displayName: string
}

export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

export type AccountFormErrors = {
  currentPassword?: string
  newPassword?: string
  confirmNewPassword?: string
  displayName?: string
  form?: string
}

export type Account = User
