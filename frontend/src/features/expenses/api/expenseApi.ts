import { ApiClientError, parseApiError, toApiClientError } from '../../../api/ApiClientError'
import type { Expense, ExpenseFilters, ExpenseWriteRequest } from '../types'

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

function buildExpensesQuery(filters: ExpenseFilters): string {
  const params = new URLSearchParams()

  if (filters.year !== undefined && filters.month !== undefined) {
    params.set('year', String(filters.year))
    params.set('month', String(filters.month))
  }

  if (filters.categoryId !== undefined) {
    params.set('categoryId', String(filters.categoryId))
  }

  const query = params.toString()
  return query.length > 0 ? `?${query}` : ''
}

export async function getExpenses(
  filters: ExpenseFilters = {},
  signal?: AbortSignal,
): Promise<Expense[]> {
  return requestJson<Expense[]>(`/api/expenses${buildExpensesQuery(filters)}`, {
    method: 'GET',
    signal,
  })
}

export async function getExpense(id: number, signal?: AbortSignal): Promise<Expense> {
  return requestJson<Expense>(`/api/expenses/${id}`, { method: 'GET', signal })
}

export async function createExpense(body: ExpenseWriteRequest): Promise<Expense> {
  return requestJson<Expense>('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateExpense(id: number, body: ExpenseWriteRequest): Promise<Expense> {
  return requestJson<Expense>(`/api/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteExpense(id: number): Promise<void> {
  await requestJson<void>(`/api/expenses/${id}`, { method: 'DELETE' })
}

export { ApiClientError }
