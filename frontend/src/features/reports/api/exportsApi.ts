import { requestBlob } from '../../../api/apiClient'
import { ApiClientError } from '../../../api/ApiClientError'

export type { BlobDownload as CsvDownload } from '../../../api/apiClient'

function pad(value: number, size: number): string {
  return String(value).padStart(size, '0')
}

export async function downloadMonthlyTransactionsCsv(
  year: number,
  month: number,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ year: String(year), month: String(month) })
  const fallbackFilename = `ledgerbloom-transactions-${pad(year, 4)}-${pad(month, 2)}.csv`
  return requestBlob(`/api/exports/monthly-transactions.csv?${params.toString()}`, fallbackFilename, {
    signal,
  })
}

export async function downloadMonthlySummaryCsv(year: number, month: number, signal?: AbortSignal) {
  const params = new URLSearchParams({ year: String(year), month: String(month) })
  const fallbackFilename = `ledgerbloom-summary-${pad(year, 4)}-${pad(month, 2)}.csv`
  return requestBlob(`/api/exports/monthly-summary.csv?${params.toString()}`, fallbackFilename, {
    signal,
  })
}

/** Triggers a browser file save for a downloaded CSV blob using a transient anchor element. */
export function saveCsvDownload(download: { blob: Blob; filename: string }): void {
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
