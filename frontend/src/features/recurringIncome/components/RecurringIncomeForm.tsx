import { useEffect, useState, type FormEvent } from 'react'
import { isAbortError } from '../../../api/ApiClientError'
import { OccurrenceChecklist } from '../../../components/OccurrenceChecklist'
import { isPastDate } from '../../../utils/dueDateUtils'
import {
  amountToRequestValue,
  normalizeAmountInput,
  validateAmount,
} from '../../../utils/moneyUtils'
import {
  CADENCE_OPTIONS,
  type OccurrencePreviewItem,
  type OccurrencePreviewRequest,
  type OccurrencePreviewResponse,
  type RecurringIncomeCadence,
  type RecurringIncomeCreateRequest,
  type RecurringIncomeFormErrors,
  type RecurringIncomeFormValues,
  type RecurringIncomeWriteRequest,
} from '../types'

type RecurringIncomeFormProps = {
  mode: 'create' | 'edit'
  initialValues: RecurringIncomeFormValues
  serverErrors?: RecurringIncomeFormErrors
  submitting?: boolean
  previewOccurrences: (
    request: OccurrencePreviewRequest,
    signal?: AbortSignal,
  ) => Promise<OccurrencePreviewResponse>
  onSubmit: (values: RecurringIncomeFormValues) => void
  onCancel: () => void
}

function validateValues(
  values: RecurringIncomeFormValues,
  mode: 'create' | 'edit',
): RecurringIncomeFormErrors {
  const errors: RecurringIncomeFormErrors = {}
  if (!values.description.trim()) {
    errors.description = 'Description is required.'
  } else if (values.description.trim().length > 160) {
    errors.description = 'Description must be at most 160 characters.'
  }
  if (!values.source.trim()) {
    errors.source = 'Source is required.'
  } else if (values.source.trim().length > 120) {
    errors.source = 'Source must be at most 120 characters.'
  }
  const amountError = validateAmount(values.amount)
  if (amountError) {
    errors.amount = amountError
  }
  if (!values.cadence.trim()) {
    errors.cadence = 'Cadence is required.'
  }
  if (!values.nextIncomeDate.trim()) {
    errors.nextIncomeDate = 'Next income date is required.'
  }

  if (values.cadence === 'SEMIMONTHLY') {
    const first = Number(values.firstPaymentDay)
    if (!values.firstPaymentDay.trim() || !Number.isInteger(first) || first < 1 || first > 31) {
      errors.firstPaymentDay = 'First day of month must be a whole number between 1 and 31.'
    }
    const second = Number(values.secondPaymentDay)
    if (!values.secondPaymentDay.trim() || !Number.isInteger(second) || second < 1 || second > 31) {
      errors.secondPaymentDay = 'Second day of month must be a whole number between 1 and 31.'
    }
    if (!errors.firstPaymentDay && !errors.secondPaymentDay && first === second) {
      errors.secondPaymentDay = 'The two days of the month must be different.'
    }
  }

  if (
    mode === 'create' &&
    values.nextIncomeDate.trim() &&
    isPastDate(values.nextIncomeDate) &&
    !values.historyMode
  ) {
    errors.historyMode = 'Choose how to handle past occurrences.'
  }

  return errors
}

function paymentDaysForCadence(values: RecurringIncomeFormValues): {
  firstPaymentDay: number | null
  secondPaymentDay: number | null
} {
  if (values.cadence !== 'SEMIMONTHLY') {
    return { firstPaymentDay: null, secondPaymentDay: null }
  }
  return {
    firstPaymentDay: Number(values.firstPaymentDay),
    secondPaymentDay: Number(values.secondPaymentDay),
  }
}

export function toRecurringIncomeWriteRequest(
  values: RecurringIncomeFormValues,
): RecurringIncomeWriteRequest {
  return {
    description: values.description.trim(),
    source: values.source.trim(),
    amount: amountToRequestValue(normalizeAmountInput(values.amount)),
    cadence: values.cadence as RecurringIncomeWriteRequest['cadence'],
    nextIncomeDate: values.nextIncomeDate,
    active: values.active,
    notes: values.notes.trim() ? values.notes.trim() : null,
    ...paymentDaysForCadence(values),
  }
}

export function toRecurringIncomeCreateRequest(
  values: RecurringIncomeFormValues,
): RecurringIncomeCreateRequest {
  const base = toRecurringIncomeWriteRequest(values)
  if (!values.historyMode) {
    return base
  }
  return {
    ...base,
    historyMode: values.historyMode,
    selectedOccurrenceDates:
      values.historyMode === 'RECORD_SELECTED' ? values.selectedOccurrenceDates : null,
  }
}

export function RecurringIncomeForm({
  mode,
  initialValues,
  serverErrors = {},
  submitting = false,
  previewOccurrences,
  onSubmit,
  onCancel,
}: RecurringIncomeFormProps) {
  const [values, setValues] = useState<RecurringIncomeFormValues>(initialValues)
  const [errors, setErrors] = useState<RecurringIncomeFormErrors>({})
  const [previewItems, setPreviewItems] = useState<OccurrencePreviewItem[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const merged: RecurringIncomeFormErrors = { ...errors, ...serverErrors }

  const pastDateChosen =
    mode === 'create' && values.nextIncomeDate.trim() !== '' && isPastDate(values.nextIncomeDate)

  useEffect(() => {
    if (mode !== 'create' || pastDateChosen) {
      return
    }
    if (values.historyMode || values.selectedOccurrenceDates.length > 0) {
      setValues((current) => ({ ...current, historyMode: '', selectedOccurrenceDates: [] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pastDateChosen])

  useEffect(() => {
    if (mode !== 'create' || !pastDateChosen || values.historyMode !== 'RECORD_SELECTED') {
      return
    }
    if (validateAmount(values.amount) || !values.cadence) {
      return
    }

    let firstDay: number | undefined
    let secondDay: number | undefined
    if (values.cadence === 'SEMIMONTHLY') {
      const first = Number(values.firstPaymentDay)
      const second = Number(values.secondPaymentDay)
      if (
        !Number.isInteger(first) ||
        !Number.isInteger(second) ||
        first < 1 ||
        first > 31 ||
        second < 1 ||
        second > 31 ||
        first === second
      ) {
        return
      }
      firstDay = first
      secondDay = second
    }

    const controller = new AbortController()
    setPreviewLoading(true)
    setPreviewError(null)
    previewOccurrences(
      {
        cadence: values.cadence as RecurringIncomeCadence,
        startDate: values.nextIncomeDate,
        amount: amountToRequestValue(normalizeAmountInput(values.amount)),
        firstPaymentDay: firstDay,
        secondPaymentDay: secondDay,
      },
      controller.signal,
    )
      .then((response) => {
        if (controller.signal.aborted) {
          return
        }
        setPreviewItems(response.occurrences)
        setValues((current) => ({
          ...current,
          selectedOccurrenceDates: response.occurrences.map((item) => item.occurrenceDate),
        }))
      })
      .catch((error) => {
        if (isAbortError(error) || controller.signal.aborted) {
          return
        }
        setPreviewError('Unable to load past occurrences. Please try again.')
        setPreviewItems([])
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setPreviewLoading(false)
        }
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    pastDateChosen,
    values.historyMode,
    values.cadence,
    values.nextIncomeDate,
    values.amount,
    values.firstPaymentDay,
    values.secondPaymentDay,
  ])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateValues(values, mode)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }
    onSubmit(values)
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit} noValidate autoComplete="off">
      {merged.form ? (
        <p className="form-error" role="alert">
          {merged.form}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="recurring-income-description">Description</label>
        <input
          id="recurring-income-description"
          value={values.description}
          disabled={submitting}
          autoComplete="off"
          aria-invalid={merged.description ? true : undefined}
          aria-describedby={merged.description ? 'recurring-income-description-error' : undefined}
          onChange={(event) =>
            setValues((current) => ({ ...current, description: event.target.value }))
          }
        />
        {merged.description ? (
          <p id="recurring-income-description-error" className="field-error" role="alert">
            {merged.description}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-income-source">Source</label>
        <input
          id="recurring-income-source"
          value={values.source}
          disabled={submitting}
          autoComplete="off"
          aria-invalid={merged.source ? true : undefined}
          aria-describedby={merged.source ? 'recurring-income-source-error' : undefined}
          onChange={(event) => setValues((current) => ({ ...current, source: event.target.value }))}
        />
        {merged.source ? (
          <p id="recurring-income-source-error" className="field-error" role="alert">
            {merged.source}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-income-amount">Amount</label>
        <input
          id="recurring-income-amount"
          type="text"
          inputMode="decimal"
          value={values.amount}
          disabled={submitting}
          aria-invalid={merged.amount ? true : undefined}
          aria-describedby={merged.amount ? 'recurring-income-amount-error' : undefined}
          onChange={(event) => setValues((current) => ({ ...current, amount: event.target.value }))}
        />
        {merged.amount ? (
          <p id="recurring-income-amount-error" className="field-error" role="alert">
            {merged.amount}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-income-cadence">Cadence</label>
        <select
          id="recurring-income-cadence"
          value={values.cadence}
          disabled={submitting}
          aria-invalid={merged.cadence ? true : undefined}
          aria-describedby={merged.cadence ? 'recurring-income-cadence-error' : undefined}
          onChange={(event) => {
            const nextCadence = event.target.value
            setValues((current) => ({
              ...current,
              cadence: nextCadence,
              firstPaymentDay:
                nextCadence === 'SEMIMONTHLY' && !current.firstPaymentDay.trim()
                  ? '1'
                  : current.firstPaymentDay,
              secondPaymentDay:
                nextCadence === 'SEMIMONTHLY' && !current.secondPaymentDay.trim()
                  ? '15'
                  : current.secondPaymentDay,
            }))
          }}
        >
          <option value="">Select cadence</option>
          {CADENCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {values.cadence === 'SEMIMONTHLY' ? (
          <p className="field-hint">
            Received twice each month on the calendar days you choose (for example, the 1st and the
            15th).
          </p>
        ) : null}
        {merged.cadence ? (
          <p id="recurring-income-cadence-error" className="field-error" role="alert">
            {merged.cadence}
          </p>
        ) : null}
      </div>

      {values.cadence === 'SEMIMONTHLY' ? (
        <div className="field-grid two-up">
          <div className="field">
            <label htmlFor="recurring-income-first-payment-day">First day of month</label>
            <input
              id="recurring-income-first-payment-day"
              type="number"
              min={1}
              max={31}
              value={values.firstPaymentDay}
              disabled={submitting}
              aria-invalid={merged.firstPaymentDay ? true : undefined}
              aria-describedby={
                merged.firstPaymentDay ? 'recurring-income-first-payment-day-error' : undefined
              }
              onChange={(event) =>
                setValues((current) => ({ ...current, firstPaymentDay: event.target.value }))
              }
            />
            {merged.firstPaymentDay ? (
              <p id="recurring-income-first-payment-day-error" className="field-error" role="alert">
                {merged.firstPaymentDay}
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="recurring-income-second-payment-day">Second day of month</label>
            <input
              id="recurring-income-second-payment-day"
              type="number"
              min={1}
              max={31}
              value={values.secondPaymentDay}
              disabled={submitting}
              aria-invalid={merged.secondPaymentDay ? true : undefined}
              aria-describedby={
                merged.secondPaymentDay ? 'recurring-income-second-payment-day-error' : undefined
              }
              onChange={(event) =>
                setValues((current) => ({ ...current, secondPaymentDay: event.target.value }))
              }
            />
            {merged.secondPaymentDay ? (
              <p id="recurring-income-second-payment-day-error" className="field-error" role="alert">
                {merged.secondPaymentDay}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="recurring-income-next-income-date">Next income date</label>
        <input
          id="recurring-income-next-income-date"
          type="date"
          value={values.nextIncomeDate}
          disabled={submitting}
          aria-invalid={merged.nextIncomeDate ? true : undefined}
          aria-describedby={
            merged.nextIncomeDate ? 'recurring-income-next-income-date-error' : undefined
          }
          onChange={(event) =>
            setValues((current) => ({ ...current, nextIncomeDate: event.target.value }))
          }
        />
        <p className="field-hint">Choose the first date this schedule applied. Past dates are allowed.</p>
        <p className="field-hint">
          A past date lets LedgerBloom identify earlier scheduled occurrences. You choose which ones
          should become actual transactions.
        </p>
        {merged.nextIncomeDate ? (
          <p id="recurring-income-next-income-date-error" className="field-error" role="alert">
            {merged.nextIncomeDate}
          </p>
        ) : null}
      </div>

      {pastDateChosen ? (
        <fieldset className="history-choice">
          <legend>How should we handle past occurrences?</legend>
          <div className="history-choice-options">
            <label className="history-choice-option">
              <input
                type="radio"
                name="recurring-income-history-mode"
                value="TRACK_FROM_NOW"
                checked={values.historyMode === 'TRACK_FROM_NOW'}
                disabled={submitting}
                onChange={() =>
                  setValues((current) => ({
                    ...current,
                    historyMode: 'TRACK_FROM_NOW',
                    selectedOccurrenceDates: [],
                  }))
                }
              />
              Track from now on
            </label>
            <label className="history-choice-option">
              <input
                type="radio"
                name="recurring-income-history-mode"
                value="RECORD_SELECTED"
                checked={values.historyMode === 'RECORD_SELECTED'}
                disabled={submitting}
                onChange={() =>
                  setValues((current) => ({ ...current, historyMode: 'RECORD_SELECTED' }))
                }
              />
              Review and record past occurrences
            </label>
          </div>
          {merged.historyMode ? (
            <p className="field-error" role="alert">
              {merged.historyMode}
            </p>
          ) : null}

          {values.historyMode === 'RECORD_SELECTED' ? (
            <div className="occurrence-preview">
              {previewLoading ? (
                <p className="status-banner" role="status" aria-live="polite">
                  Loading past occurrences…
                </p>
              ) : null}
              {previewError ? (
                <p className="field-error" role="alert">
                  {previewError}
                </p>
              ) : null}
              {!previewLoading && !previewError && previewItems.length > 0 ? (
                <>
                  <p className="field-hint">Select which past occurrences to record as real transactions.</p>
                  <OccurrenceChecklist
                    idPrefix="recurring-income-occurrence"
                    items={previewItems.map((item) => ({ date: item.occurrenceDate, amount: item.amount }))}
                    selected={new Set(values.selectedOccurrenceDates)}
                    disabled={submitting}
                    onToggle={(date) =>
                      setValues((current) => {
                        const next = new Set(current.selectedOccurrenceDates)
                        if (next.has(date)) {
                          next.delete(date)
                        } else {
                          next.add(date)
                        }
                        return { ...current, selectedOccurrenceDates: Array.from(next) }
                      })
                    }
                  />
                </>
              ) : null}
              {!previewLoading && !previewError && previewItems.length === 0 ? (
                <p className="field-hint">No past occurrences found for this schedule.</p>
              ) : null}
            </div>
          ) : null}
        </fieldset>
      ) : null}

      <div className="field">
        <label htmlFor="recurring-income-active">
          <input
            id="recurring-income-active"
            type="checkbox"
            checked={values.active}
            disabled={submitting}
            onChange={(event) =>
              setValues((current) => ({ ...current, active: event.target.checked }))
            }
          />{' '}
          Active
        </label>
      </div>

      <div className="field">
        <label htmlFor="recurring-income-notes">Notes</label>
        <textarea
          id="recurring-income-notes"
          name="recurringIncomeNotes"
          value={values.notes}
          disabled={submitting}
          rows={3}
          autoComplete="off"
          onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting
            ? 'Saving…'
            : mode === 'create'
              ? 'Create recurring income'
              : 'Save changes'}
        </button>
        <button type="button" className="button button-secondary" disabled={submitting} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
