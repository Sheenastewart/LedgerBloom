import { ApiClientError, parseApiError, toApiClientError } from '../../../api/ApiClientError'
import type { Category, CategoryWriteRequest } from '../types'

function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })

    if (!response.ok) {
      throw await parseApiError(response)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  } catch (error) {
    throw toApiClientError(error)
  }
}

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
