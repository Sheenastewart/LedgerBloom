import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import { downloadMonthlySummaryCsv, downloadMonthlyTransactionsCsv } from './exportsApi'

function mockFetchOnce(response: Partial<Response> & { headers: Headers }) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob(['csv content']),
      text: async () => '',
      ...response,
    }),
  )
}

describe('exportsApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('parses the filename from Content-Disposition for transactions CSV', async () => {
    mockFetchOnce({
      headers: new Headers({
        'Content-Disposition': 'attachment; filename="ledgerbloom-transactions-2026-07.csv"',
      }),
    })

    const result = await downloadMonthlyTransactionsCsv(2026, 7)

    expect(result.filename).toBe('ledgerbloom-transactions-2026-07.csv')
    expect(result.blob).toBeInstanceOf(Blob)
  })

  it('parses the filename from Content-Disposition for summary CSV', async () => {
    mockFetchOnce({
      headers: new Headers({
        'Content-Disposition': 'attachment; filename="ledgerbloom-summary-2026-07.csv"',
      }),
    })

    const result = await downloadMonthlySummaryCsv(2026, 7)

    expect(result.filename).toBe('ledgerbloom-summary-2026-07.csv')
  })

  it('falls back to a generated filename when Content-Disposition is missing', async () => {
    mockFetchOnce({ headers: new Headers() })

    const result = await downloadMonthlyTransactionsCsv(2026, 3)

    expect(result.filename).toBe('ledgerbloom-transactions-2026-03.csv')
  })

  it('parses a JSON error body for a failed export', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        text: async () => JSON.stringify({ message: 'year and month must both be provided', code: 'INVALID_REPORT_PERIOD' }),
      }),
    )

    await expect(downloadMonthlyTransactionsCsv(undefined as unknown as number, undefined as unknown as number)).rejects.toMatchObject(
      {
        message: 'year and month must both be provided',
        code: 'INVALID_REPORT_PERIOD',
        status: 400,
      },
    )
  })

  it('falls back to a generic error message when the error body cannot be parsed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        text: async () => 'not json',
      }),
    )

    await expect(downloadMonthlySummaryCsv(2026, 7)).rejects.toMatchObject({
      message: 'Something went wrong. Please try again.',
      code: 'UNEXPECTED_ERROR',
      status: 500,
    })
  })

  it('wraps network failures as an ApiClientError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const error = await downloadMonthlyTransactionsCsv(2026, 7).catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ApiClientError)
    expect((error as ApiClientError).code).toBe('NETWORK_ERROR')
  })
})
