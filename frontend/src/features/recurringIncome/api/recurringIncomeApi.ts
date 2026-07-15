import { ApiClientError, parseApiError, toApiClientError } from '../../../api/ApiClientError'
import type {
  MarkReceivedRequest,
  MarkReceivedResult,
  RecurringIncome,
  RecurringIncomeFilters,
  RecurringIncomeWriteRequest,
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

function buildQuery(filters: RecurringIncomeFilters): string {
  const params = new URLSearchParams()
  if (filters.active !== undefined) {
    params.set('active', String(filters.active))
  }
  if (filters.cadence !== undefined) {
    params.set('cadence', filters.cadence)
  }
  if (filters.source !== undefined && filters.source.trim()) {
    params.set('source', filters.source.trim())
  }
  const query = params.toString()
  return query.length > 0 ? `?${query}` : ''
}

export async function getRecurringIncome(
  filters: RecurringIncomeFilters = {},
  signal?: AbortSignal,
): Promise<RecurringIncome[]> {
  return requestJson<RecurringIncome[]>(`/api/recurring-income${buildQuery(filters)}`, {
    method: 'GET',
    signal,
  })
}

export async function getUpcomingRecurringIncome(
  days?: number,
  signal?: AbortSignal,
): Promise<RecurringIncome[]> {
  const params = days === undefined ? '' : `?days=${days}`
  return requestJson<RecurringIncome[]>(`/api/recurring-income/upcoming${params}`, {
    method: 'GET',
    signal,
  })
}

export async function getRecurringIncomeById(
  id: number,
  signal?: AbortSignal,
): Promise<RecurringIncome> {
  return requestJson<RecurringIncome>(`/api/recurring-income/${id}`, { method: 'GET', signal })
}

export async function createRecurringIncome(
  body: RecurringIncomeWriteRequest,
): Promise<RecurringIncome> {
  return requestJson<RecurringIncome>('/api/recurring-income', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateRecurringIncome(
  id: number,
  body: RecurringIncomeWriteRequest,
): Promise<RecurringIncome> {
  return requestJson<RecurringIncome>(`/api/recurring-income/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteRecurringIncome(id: number): Promise<void> {
  await requestJson<void>(`/api/recurring-income/${id}`, { method: 'DELETE' })
}

export async function markRecurringIncomeReceived(
  id: number,
  body: MarkReceivedRequest,
): Promise<MarkReceivedResult> {
  return requestJson<MarkReceivedResult>(`/api/recurring-income/${id}/mark-received`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export { ApiClientError }
