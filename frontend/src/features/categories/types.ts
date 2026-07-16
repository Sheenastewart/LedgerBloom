import type { FieldErrorDetail } from '../../api/ApiClientError'

export type Category = {
  id: number
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export type CategoryWriteRequest = {
  name: string
  description: string | null
}

export type StarterCategoriesResult = {
  createdCount: number
  createdNames: string[]
  skippedCount: number
  skippedNames: string[]
}

export type CategoryFormValues = {
  name: string
  description: string
}

export type CategoryFormErrors = {
  name?: string
  description?: string
  form?: string
}

export type { FieldErrorDetail }
