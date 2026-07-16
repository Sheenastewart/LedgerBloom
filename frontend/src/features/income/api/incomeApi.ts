import { ApiClientError, requestJson } from '../../../api/apiClient'
import type { IncomeEntry, IncomeFilters, IncomeWriteRequest } from '../types'

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
