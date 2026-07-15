export type HealthResponse = {
  status: string
  service: string
}

export async function fetchHealth(
  apiBaseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<HealthResponse> {
  const response = await fetchImpl(`${apiBaseUrl}/api/health`)

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`)
  }

  return response.json() as Promise<HealthResponse>
}
