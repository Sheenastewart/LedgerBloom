import { ApiClientError, parseApiError, toApiClientError } from '../../../api/ApiClientError'
import type { IncomeEntry, IncomeFilters, IncomeWriteRequest } from '../types'

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

function buildIncomeQuery(filters: IncomeFilters): string {
  const params = new URLSearchParams()

  if (filters.year !== undefined && filters.month !== undefined) {
    params.set('year', String(filters.year))
    params.set('month', String(filters.month))
  }

  if (filters.source !== undefined) {
    params.set('source', filters.source)
  }

  const query = params.toString()
  return query.length > 0 ? `?${query}` : ''
}

export async function getIncomeEntries(
  filters: IncomeFilters = {},
  signal?: AbortSignal,
): Promise<IncomeEntry[]> {
  return requestJson<IncomeEntry[]>(`/api/income${buildIncomeQuery(filters)}`, {
    method: 'GET',
    signal,
  })
}

export async function getIncomeEntry(id: number, signal?: AbortSignal): Promise<IncomeEntry> {
  return requestJson<IncomeEntry>(`/api/income/${id}`, { method: 'GET', signal })
}

export async function createIncomeEntry(body: IncomeWriteRequest): Promise<IncomeEntry> {
  return requestJson<IncomeEntry>('/api/income', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateIncomeEntry(
  id: number,
  body: IncomeWriteRequest,
): Promise<IncomeEntry> {
  return requestJson<IncomeEntry>(`/api/income/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteIncomeEntry(id: number): Promise<void> {
  await requestJson<void>(`/api/income/${id}`, { method: 'DELETE' })
}

export { ApiClientError }
