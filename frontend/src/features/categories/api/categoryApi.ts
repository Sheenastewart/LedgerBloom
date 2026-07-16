import { ApiClientError, requestJson } from '../../../api/apiClient'
import type { Category, CategoryWriteRequest } from '../types'

export async function getCategories(signal?: AbortSignal): Promise<Category[]> {
  return requestJson<Category[]>('/api/categories', { method: 'GET', signal })
}

export async function getCategory(id: number, signal?: AbortSignal): Promise<Category> {
  return requestJson<Category>(`/api/categories/${id}`, { method: 'GET', signal })
}

export async function createCategory(body: CategoryWriteRequest): Promise<Category> {
  return requestJson<Category>('/api/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateCategory(
  id: number,
  body: CategoryWriteRequest,
): Promise<Category> {
  return requestJson<Category>(`/api/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteCategory(id: number): Promise<void> {
  await requestJson<void>(`/api/categories/${id}`, { method: 'DELETE' })
}

export { ApiClientError }
