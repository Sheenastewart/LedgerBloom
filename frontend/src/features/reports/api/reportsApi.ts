import { ApiClientError, parseApiError, toApiClientError } from '../../../api/ApiClientError'
import type { MonthlyComparisonResponse, MonthRange, YearToDateResponse } from '../types'

function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...init?.headers,
      },
    })

    if (!response.ok) {
      throw await parseApiError(response)
    }

    return (await response.json()) as T
  } catch (error) {
    throw toApiClientError(error)
  }
}

export async function getMonthlyComparison(
  range: MonthRange,
  signal?: AbortSignal,
): Promise<MonthlyComparisonResponse> {
  const params = new URLSearchParams({
    startYear: String(range.startYear),
    startMonth: String(range.startMonth),
    endYear: String(range.endYear),
    endMonth: String(range.endMonth),
  })
  return requestJson<MonthlyComparisonResponse>(
    `/api/reports/monthly-comparison?${params.toString()}`,
    { signal },
  )
}

export async function getYearToDate(year: number, signal?: AbortSignal): Promise<YearToDateResponse> {
  const params = new URLSearchParams({ year: String(year) })
  return requestJson<YearToDateResponse>(`/api/reports/year-to-date?${params.toString()}`, { signal })
}

export type { ApiClientError }
