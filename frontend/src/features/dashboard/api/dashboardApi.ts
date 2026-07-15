import { ApiClientError, parseApiError, toApiClientError } from '../../../api/ApiClientError'
import type { DashboardPeriod, MonthlyDashboard } from '../types'

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

export async function getMonthlyDashboard(
  period: DashboardPeriod,
  signal?: AbortSignal,
): Promise<MonthlyDashboard> {
  const params = new URLSearchParams({
    year: String(period.year),
    month: String(period.month),
  })
  return requestJson<MonthlyDashboard>(`/api/dashboard/monthly?${params.toString()}`, { signal })
}

export type { ApiClientError }
