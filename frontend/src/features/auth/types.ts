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
