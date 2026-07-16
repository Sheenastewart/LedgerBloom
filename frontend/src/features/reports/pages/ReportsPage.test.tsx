import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../../../api/ApiClientError'
import * as exportsApi from '../api/exportsApi'
import { ReportsPage } from './ReportsPage'

vi.mock('../api/exportsApi', () => ({
  downloadMonthlyTransactionsCsv: vi.fn(),
  downloadMonthlySummaryCsv: vi.fn(),
  saveCsvDownload: vi.fn(),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/reports']}>
      <Routes>
        <Route path="/reports" element={<ReportsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ReportsPage', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.mocked(exportsApi.downloadMonthlyTransactionsCsv).mockReset()
    vi.mocked(exportsApi.downloadMonthlySummaryCsv).mockReset()
    vi.mocked(exportsApi.saveCsvDownload).mockReset()
  })

  it('renders overview links and the CSV export panel', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Reports' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View trends' })).toHaveAttribute('href', '/reports/trends')
    expect(screen.getByRole('link', { name: 'View year-to-date' })).toHaveAttribute(
      'href',
      '/reports/year-to-date',
    )
    expect(screen.getByRole('link', { name: 'View monthly report' })).toHaveAttribute(
      'href',
      '/reports/monthly',
    )
    expect(screen.getByRole('heading', { name: /CSV exports/ })).toBeInTheDocument()
  })

  it('downloads a transactions CSV and shows a success message', async () => {
    const user = userEvent.setup()
    vi.mocked(exportsApi.downloadMonthlyTransactionsCsv).mockResolvedValue({
      blob: new Blob(['csv']),
      filename: 'ledgerbloom-transactions-2026-07.csv',
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: 'Download transactions CSV' }))

    expect(await screen.findByText('Downloaded ledgerbloom-transactions-2026-07.csv.')).toBeInTheDocument()
    expect(exportsApi.saveCsvDownload).toHaveBeenCalledWith({
      blob: expect.any(Blob),
      filename: 'ledgerbloom-transactions-2026-07.csv',
    })
  })

  it('downloads a summary CSV and shows a success message', async () => {
    const user = userEvent.setup()
    vi.mocked(exportsApi.downloadMonthlySummaryCsv).mockResolvedValue({
      blob: new Blob(['csv']),
      filename: 'ledgerbloom-summary-2026-07.csv',
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: 'Download summary CSV' }))

    expect(await screen.findByText('Downloaded ledgerbloom-summary-2026-07.csv.')).toBeInTheDocument()
  })

  it('shows an error message when the export fails', async () => {
    const user = userEvent.setup()
    vi.mocked(exportsApi.downloadMonthlyTransactionsCsv).mockRejectedValue(
      new ApiClientError({ message: 'boom', code: 'EXPORT_GENERATION_FAILED', status: 500 }),
    )

    renderPage()

    await user.click(screen.getByRole('button', { name: 'Download transactions CSV' }))

    expect(
      await screen.findByText('Unable to generate the CSV export. Please try again.'),
    ).toBeInTheDocument()
  })
})
