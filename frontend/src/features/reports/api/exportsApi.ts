import { ApiClientError, toApiClientError } from '../../../api/ApiClientError'

function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
}

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'
const FILENAME_PATTERN = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i

export type CsvDownload = {
  blob: Blob
  filename: string
}

function parseFilename(contentDisposition: string | null, fallbackFilename: string): string {
  if (!contentDisposition) {
    return fallbackFilename
  }
  const match = FILENAME_PATTERN.exec(contentDisposition)
  const extracted = match?.[1]?.trim()
  return extracted && extracted.length > 0 ? extracted : fallbackFilename
}

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

async function downloadCsv(
  path: string,
  fallbackFilename: string,
  signal?: AbortSignal,
): Promise<CsvDownload> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      signal,
      headers: { Accept: 'text/csv' },
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

function pad(value: number, size: number): string {
  return String(value).padStart(size, '0')
}

export async function downloadMonthlyTransactionsCsv(
  year: number,
  month: number,
  signal?: AbortSignal,
): Promise<CsvDownload> {
  const params = new URLSearchParams({ year: String(year), month: String(month) })
  const fallbackFilename = `ledgerbloom-transactions-${pad(year, 4)}-${pad(month, 2)}.csv`
  return downloadCsv(`/api/exports/monthly-transactions.csv?${params.toString()}`, fallbackFilename, signal)
}

export async function downloadMonthlySummaryCsv(
  year: number,
  month: number,
  signal?: AbortSignal,
): Promise<CsvDownload> {
  const params = new URLSearchParams({ year: String(year), month: String(month) })
  const fallbackFilename = `ledgerbloom-summary-${pad(year, 4)}-${pad(month, 2)}.csv`
  return downloadCsv(`/api/exports/monthly-summary.csv?${params.toString()}`, fallbackFilename, signal)
}

/** Triggers a browser file save for a downloaded CSV blob using a transient anchor element. */
export function saveCsvDownload(download: CsvDownload): void {
  const url = URL.createObjectURL(download.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = download.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export type { ApiClientError }
