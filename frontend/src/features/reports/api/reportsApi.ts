import { ApiClientError, requestJson } from '../../../api/apiClient'
import type { MonthlyComparisonResponse, MonthRange, YearToDateResponse } from '../types'

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
