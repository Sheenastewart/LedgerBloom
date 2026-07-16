import { useState } from 'react'
import { isAbortError } from '../api/ApiClientError'
import { formatIsoDate } from '../utils/moneyUtils'
import { OccurrenceChecklist } from './OccurrenceChecklist'

export type CatchUpPreviewOccurrence = {
  occurrenceDate: string
  amount: number
}

export type CatchUpPreviewResult = {
  occurrences: CatchUpPreviewOccurrence[]
  suggestedNextOnOrAfterToday: string
}

export type CatchUpSummary = {
  createdCount: number
  createdDates: string[]
  nextOccurrenceDate: string
}

type RecurringCatchUpControlProps<TResult extends CatchUpSummary> = {
  idPrefix: string
  loadPreview: (signal: AbortSignal) => Promise<CatchUpPreviewResult>
  submitCatchUp: (occurrenceDates: string[]) => Promise<TResult>
  onRecorded: (result: TResult) => void
  disabled?: boolean
}

/**
 * Self-contained expandable panel (no modal) that lets a caller review overdue cadence
 * occurrences for an existing recurring schedule and select which ones to record via the
 * catch-up API. Rendered inline within a list item's action area.
 */
export function RecurringCatchUpControl<TResult extends CatchUpSummary>({
  idPrefix,
  loadPreview,
  submitCatchUp,
  onRecorded,
  disabled = false,
}: RecurringCatchUpControlProps<TResult>) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [occurrences, setOccurrences] = useState<CatchUpPreviewOccurrence[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<TResult | null>(null)

  async function handleToggleOpen() {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    setResult(null)
    setSubmitError(null)
    setLoading(true)
    setLoadError(null)
    try {
      const response = await loadPreview(new AbortController().signal)
      setOccurrences(response.occurrences)
      setSelected(new Set(response.occurrences.map((item) => item.occurrenceDate)))
    } catch (error) {
      if (!isAbortError(error)) {
        setLoadError('Unable to load past occurrences. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  function toggleDate(date: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const response = await submitCatchUp(Array.from(selected))
      setResult(response)
      onRecorded(response)
    } catch {
      setSubmitError('Unable to record past occurrences. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="catch-up-control">
      <button
        type="button"
        className="button button-secondary"
        disabled={disabled}
        onClick={() => void handleToggleOpen()}
      >
        {open ? 'Hide past occurrences' : 'Record past occurrences'}
      </button>
      {open ? (
        <div className="catch-up-panel" role="region" aria-label="Record past occurrences">
          {loading ? (
            <p className="status-banner" role="status" aria-live="polite">
              Loading past occurrences…
            </p>
          ) : null}
          {loadError ? (
            <p className="field-error" role="alert">
              {loadError}
            </p>
          ) : null}
          {!loading && !loadError && result ? (
            <div className="catch-up-summary" role="status" aria-live="polite">
              <p>
                Recorded {result.createdCount} occurrence{result.createdCount === 1 ? '' : 's'}
                {result.createdDates.length > 0
                  ? `: ${result.createdDates.map((date) => formatIsoDate(date)).join(', ')}`
                  : ''}
                .
              </p>
              <p>Next scheduled date: {formatIsoDate(result.nextOccurrenceDate)}</p>
            </div>
          ) : null}
          {!loading && !loadError && !result && occurrences.length === 0 ? (
            <p className="field-hint">No past occurrences to record.</p>
          ) : null}
          {!loading && !loadError && !result && occurrences.length > 0 ? (
            <>
              <p className="field-hint">Select which past occurrences to record as real transactions.</p>
              <OccurrenceChecklist
                idPrefix={idPrefix}
                items={occurrences.map((item) => ({ date: item.occurrenceDate, amount: item.amount }))}
                selected={selected}
                onToggle={toggleDate}
                disabled={submitting}
              />
              {submitError ? (
                <p className="field-error" role="alert">
                  {submitError}
                </p>
              ) : null}
              <div className="form-actions">
                <button
                  type="button"
                  className="button button-primary"
                  disabled={submitting || selected.size === 0}
                  onClick={() => void handleSubmit()}
                >
                  {submitting
                    ? 'Recording…'
                    : `Record ${selected.size} occurrence${selected.size === 1 ? '' : 's'}`}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
