import { ApiClientError, requestJson } from '../../../api/apiClient'
import type {
  MarkReceivedRequest,
  MarkReceivedResult,
  RecurringIncome,
  RecurringIncomeFilters,
  RecurringIncomeWriteRequest,
} from '../types'

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
