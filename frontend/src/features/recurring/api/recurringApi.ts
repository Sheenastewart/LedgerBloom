import { ApiClientError, parseApiError, toApiClientError } from '../../../api/ApiClientError'
import type {
  MarkPaidRequest,
  MarkPaidResult,
  RecurringExpense,
  RecurringFilters,
  RecurringWriteRequest,
} from '../types'

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

function buildQuery(filters: RecurringFilters): string {
  const params = new URLSearchParams()
  if (filters.active !== undefined) {
    params.set('active', String(filters.active))
  }
  if (filters.categoryId !== undefined) {
    params.set('categoryId', String(filters.categoryId))
  }
  if (filters.cadence !== undefined) {
    params.set('cadence', filters.cadence)
  }
  const query = params.toString()
  return query.length > 0 ? `?${query}` : ''
}

export async function getRecurringExpenses(
  filters: RecurringFilters = {},
  signal?: AbortSignal,
): Promise<RecurringExpense[]> {
  return requestJson<RecurringExpense[]>(`/api/recurring-expenses${buildQuery(filters)}`, {
    method: 'GET',
    signal,
  })
}

export async function getUpcomingRecurringExpenses(
  days?: number,
  signal?: AbortSignal,
): Promise<RecurringExpense[]> {
  const params = days === undefined ? '' : `?days=${days}`
  return requestJson<RecurringExpense[]>(`/api/recurring-expenses/upcoming${params}`, {
    method: 'GET',
    signal,
  })
}

export async function getRecurringExpense(
  id: number,
  signal?: AbortSignal,
): Promise<RecurringExpense> {
  return requestJson<RecurringExpense>(`/api/recurring-expenses/${id}`, { method: 'GET', signal })
}

export async function createRecurringExpense(
  body: RecurringWriteRequest,
): Promise<RecurringExpense> {
  return requestJson<RecurringExpense>('/api/recurring-expenses', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateRecurringExpense(
  id: number,
  body: RecurringWriteRequest,
): Promise<RecurringExpense> {
  return requestJson<RecurringExpense>(`/api/recurring-expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteRecurringExpense(id: number): Promise<void> {
  await requestJson<void>(`/api/recurring-expenses/${id}`, { method: 'DELETE' })
}

export async function markRecurringExpensePaid(
  id: number,
  body: MarkPaidRequest,
): Promise<MarkPaidResult> {
  return requestJson<MarkPaidResult>(`/api/recurring-expenses/${id}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export { ApiClientError }
