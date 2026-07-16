import { ApiClientError, requestJson } from '../../../api/apiClient'
import type { DashboardPeriod, MonthlyDashboard } from '../types'

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
