export type User = {
  id: number
  email: string
  displayName: string
  createdAt: string
  lastLoginAt: string | null
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  email: string
  password: string
  confirmPassword: string
  displayName: string
}

export type ForgotPasswordRequest = {
  email: string
}

export type ForgotPasswordResponse = {
  message: string
}

export type ResetPasswordRequest = {
  token: string
  newPassword: string
  confirmNewPassword: string
}

export type MessageResponse = {
  message: string
}

export type LoginFormErrors = {
  email?: string
  password?: string
  form?: string
}

export type RegisterFormErrors = {
  email?: string
  password?: string
  confirmPassword?: string
  displayName?: string
  form?: string
}
