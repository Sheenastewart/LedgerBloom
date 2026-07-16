import { ApiClientError, isAbortError, parseApiError, toApiClientError } from './ApiClientError'

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Returns the configured API origin, defaulting to the local backend during development. */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
}

/** Reads a cookie value by name, decoding it. Returns null when the cookie is absent. */
export function readCookie(name: string): string | null {
  if (typeof document === 'undefined' || !document.cookie) {
    return null
  }

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Ensures an XSRF-TOKEN cookie exists before mutating requests.
 * Spring Security's SPA CSRF mode sets the cookie on GET /api/health (public).
 */
export async function ensureCsrfToken(fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const existing = readCookie('XSRF-TOKEN')
  if (existing) {
    return existing
  }

  await fetchImpl(`${getApiBaseUrl()}/api/health`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  return readCookie('XSRF-TOKEN')
}

function buildHeaders(init: RequestInit | undefined, csrfToken: string | null): HeadersInit {
  const method = (init?.method ?? 'GET').toUpperCase()
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
  }

  if (!SAFE_METHODS.has(method) && csrfToken) {
    headers['X-XSRF-TOKEN'] = csrfToken
  }

  return { ...headers, ...init?.headers }
}

/**
 * Shared JSON request helper for all feature API modules. Always sends cookies
 * (`credentials: 'include'`) so the session cookie is attached, and echoes the
 * XSRF-TOKEN cookie back as a header for mutating requests per the backend's
 * SPA CSRF convention.
 */
export async function requestJson<T>(
  path: string,
  init?: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  try {
    const method = (init?.method ?? 'GET').toUpperCase()
    const csrfToken = SAFE_METHODS.has(method) ? readCookie('XSRF-TOKEN') : await ensureCsrfToken(fetchImpl)

    const response = await fetchImpl(`${getApiBaseUrl()}${path}`, {
      ...init,
      credentials: 'include',
      headers: buildHeaders(init, csrfToken),
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

export type BlobDownload = {
  blob: Blob
  filename: string
}

const FILENAME_PATTERN = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i

function parseFilename(contentDisposition: string | null, fallbackFilename: string): string {
  if (!contentDisposition) {
    return fallbackFilename
  }
  const match = FILENAME_PATTERN.exec(contentDisposition)
  const extracted = match?.[1]?.trim()
  return extracted && extracted.length > 0 ? extracted : fallbackFilename
}

/**
 * Blob error bodies are read via text() rather than json() because a failed CSV
 * export may respond with either a JSON error body or an empty/plain-text body,
 * and text() -> JSON.parse keeps this parsing independent from response.json()'s
 * stream-consumption semantics.
 */
async function parseBlobApiError(response: Response): Promise<ApiClientError> {
  let body: { message?: string; code?: string } | null = null

  try {
    const text = await response.text()
    body = text.trim().length > 0 ? (JSON.parse(text) as { message?: string; code?: string }) : null
  } catch {
    body = null
  }

  const message =
    typeof body?.message === 'string' && body.message.trim().length > 0
      ? body.message
      : GENERIC_ERROR_MESSAGE

  const code =
    typeof body?.code === 'string' && body.code.trim().length > 0 ? body.code : 'UNEXPECTED_ERROR'

  return new ApiClientError({ message, status: response.status, code })
}

/**
 * Shared blob-download helper for CSV exports. Mirrors requestJson's credential
 * handling but returns the raw response body as a Blob along with the filename
 * advertised in the Content-Disposition header (falling back when absent).
 */
export async function requestBlob(
  path: string,
  fallbackFilename: string,
  init?: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<BlobDownload> {
  try {
    const method = (init?.method ?? 'GET').toUpperCase()
    const csrfToken = SAFE_METHODS.has(method) ? readCookie('XSRF-TOKEN') : await ensureCsrfToken(fetchImpl)

    const response = await fetchImpl(`${getApiBaseUrl()}${path}`, {
      ...init,
      credentials: 'include',
      headers: buildHeaders(
        { ...init, headers: { Accept: 'text/csv', ...init?.headers } },
        csrfToken,
      ),
    })

    if (!response.ok) {
      throw await parseBlobApiError(response)
    }

    const blob = await response.blob()
    const filename = parseFilename(response.headers.get('Content-Disposition'), fallbackFilename)
    return { blob, filename }
  } catch (error) {
    throw toApiClientError(error)
  }
}

export { ApiClientError, isAbortError, parseApiError, toApiClientError }
