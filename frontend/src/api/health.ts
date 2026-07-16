import { requestJson } from './apiClient'

export type HealthResponse = {
  status: string
  service: string
}

export async function fetchHealth(
  _apiBaseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<HealthResponse> {
  return requestJson<HealthResponse>('/api/health', { method: 'GET' }, fetchImpl)
}
