import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { isAbortError } from '../../../api/ApiClientError'
import { OccurrenceChecklist } from '../../../components/OccurrenceChecklist'
import { isPastDate } from '../../../utils/dueDateUtils'
import { isOtherCategoryName } from '../../../utils/expenseDisplay'
import {
  amountToRequestValue,
  normalizeAmountInput,
  validateAmount,
} from '../../../utils/moneyUtils'
import { paths } from '../../../routes/paths'
import type { Category } from '../../categories/types'
import {
  CADENCE_OPTIONS,
  type OccurrencePreviewItem,
  type OccurrencePreviewRequest,
  type OccurrencePreviewResponse,
  type RecurringCadence,
  type RecurringCreateRequest,
  type RecurringFormErrors,
  type RecurringFormValues,
  type RecurringWriteRequest,
} from '../types'

type RecurringFormProps = {
  mode: 'create' | 'edit'
  initialValues: RecurringFormValues
  categories: Category[]
  serverErrors?: RecurringFormErrors
  submitting?: boolean
  previewOccurrences: (
    request: OccurrencePreviewRequest,
    signal?: AbortSignal,
  ) => Promise<OccurrencePreviewResponse>
  onSubmit: (values: RecurringFormValues) => void
  onCancel: () => void
}

function selectedCategoryName(values: RecurringFormValues, categories: Category[]): string {
  return categories.find((category) => String(category.id) === values.categoryId)?.name ?? ''
}

function validateValues(
  values: RecurringFormValues,
  mode: 'create' | 'edit',
  categories: Category[],
): RecurringFormErrors {
  const errors: RecurringFormErrors = {}
  const categoryName = selectedCategoryName(values, categories)
  const trimmedDescription = values.description.trim()

  if (!values.categoryId.trim()) {
    errors.categoryId = 'Category is required.'
  }

  if (isOtherCategoryName(categoryName) && !values.merchant.trim()) {
    errors.merchant = 'Merchant is required when category is Other.'
  } else if (values.merchant.trim().length > 120) {
    errors.merchant = 'Merchant must be at most 120 characters.'
  }

  if (trimmedDescription.length > 160) {
    errors.description = 'Payment source must be at most 160 characters.'
  }
  const amountError = validateAmount(values.amount)
  if (amountError) {
    errors.amount = amountError
  }
  if (!values.cadence.trim()) {
    errors.cadence = 'Cadence is required.'
  }
  if (!values.nextPaymentDate.trim()) {
    errors.nextPaymentDate = 'Next payment date is required.'
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
    values.nextPaymentDate.trim() &&
    isPastDate(values.nextPaymentDate) &&
    !values.historyMode
  ) {
    errors.historyMode = 'Choose how to handle past occurrences.'
  }

  return errors
}

function paymentDaysForCadence(values: RecurringFormValues): {
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

export function toRecurringWriteRequest(values: RecurringFormValues): RecurringWriteRequest {
  const description = values.description.trim()
  return {
    description: description.length === 0 ? null : description,
    merchant: values.merchant.trim() ? values.merchant.trim() : null,
    amount: amountToRequestValue(normalizeAmountInput(values.amount)),
    categoryId: Number(values.categoryId),
    cadence: values.cadence as RecurringWriteRequest['cadence'],
    nextPaymentDate: values.nextPaymentDate,
    active: values.active,
    notes: values.notes.trim() ? values.notes.trim() : null,
    ...paymentDaysForCadence(values),
  }
}

export function toRecurringCreateRequest(values: RecurringFormValues): RecurringCreateRequest {
  const base = toRecurringWriteRequest(values)
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

export function RecurringForm({
  mode,
  initialValues,
  categories,
  serverErrors = {},
  submitting = false,
  previewOccurrences,
  onSubmit,
  onCancel,
}: RecurringFormProps) {
  const [values, setValues] = useState<RecurringFormValues>(initialValues)
  const [errors, setErrors] = useState<RecurringFormErrors>({})
  const [previewItems, setPreviewItems] = useState<OccurrencePreviewItem[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const merged: RecurringFormErrors = { ...errors, ...serverErrors }

  const pastDateChosen =
    mode === 'create' && values.nextPaymentDate.trim() !== '' && isPastDate(values.nextPaymentDate)

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
        cadence: values.cadence as RecurringCadence,
        startDate: values.nextPaymentDate,
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
    values.nextPaymentDate,
    values.amount,
    values.firstPaymentDay,
    values.secondPaymentDay,
  ])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateValues(values, mode, categories)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }
    onSubmit(values)
  }

  const categoryName = selectedCategoryName(values, categories)
  const otherSelected = isOtherCategoryName(categoryName)

  return (
    <form className="entity-form" onSubmit={handleSubmit} noValidate autoComplete="off">
      {merged.form ? (
        <p className="form-error" role="alert">
          {merged.form}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="recurring-category">Category</label>
        <select
          id="recurring-category"
          value={values.categoryId}
          disabled={submitting}
          aria-invalid={merged.categoryId ? true : undefined}
          aria-describedby={merged.categoryId ? 'recurring-category-error' : undefined}
          onChange={(event) => setValues((current) => ({ ...current, categoryId: event.target.value }))}
        >
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
        {merged.categoryId ? (
          <p id="recurring-category-error" className="field-error" role="alert">
            {merged.categoryId}
          </p>
        ) : null}
        <p className="field-hint">
          <Link to={paths.budgetsCategories}>Manage categories</Link>
        </p>
      </div>

      <div className="field">
        <label htmlFor="recurring-merchant">Merchant</label>
        <input
          id="recurring-merchant"
          value={values.merchant}
          disabled={submitting}
          autoComplete="off"
          aria-invalid={merged.merchant ? true : undefined}
          aria-describedby={merged.merchant ? 'recurring-merchant-error' : 'recurring-merchant-hint'}
          onChange={(event) => setValues((current) => ({ ...current, merchant: event.target.value }))}
        />
        <p id="recurring-merchant-hint" className="field-hint">
          {otherSelected
            ? 'Required when category is Other'
            : 'Who was paid — for example Netflix or the power company'}
        </p>
        {merged.merchant ? (
          <p id="recurring-merchant-error" className="field-error" role="alert">
            {merged.merchant}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-description">Payment source</label>
        <input
          id="recurring-description"
          value={values.description}
          disabled={submitting}
          autoComplete="off"
          aria-invalid={merged.description ? true : undefined}
          aria-describedby={
            merged.description ? 'recurring-description-error' : 'recurring-description-hint'
          }
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
        />
        <p id="recurring-description-hint" className="field-hint">
          Optional — which card or account this comes from
        </p>
        {merged.description ? (
          <p id="recurring-description-error" className="field-error" role="alert">
            {merged.description}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-amount">Amount</label>
        <input
          id="recurring-amount"
          type="text"
          inputMode="decimal"
          value={values.amount}
          disabled={submitting}
          aria-invalid={merged.amount ? true : undefined}
          aria-describedby={merged.amount ? 'recurring-amount-error' : undefined}
          onChange={(event) => setValues((current) => ({ ...current, amount: event.target.value }))}
        />
        {merged.amount ? (
          <p id="recurring-amount-error" className="field-error" role="alert">
            {merged.amount}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="recurring-cadence">Cadence</label>
        <select
          id="recurring-cadence"
          value={values.cadence}
          disabled={submitting}
          aria-invalid={merged.cadence ? true : undefined}
          aria-describedby={merged.cadence ? 'recurring-cadence-error' : undefined}
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
            Paid twice each month on the calendar days you choose (for example, the 1st and the
            15th).
          </p>
        ) : null}
        {merged.cadence ? (
          <p id="recurring-cadence-error" className="field-error" role="alert">
            {merged.cadence}
          </p>
        ) : null}
      </div>

      {values.cadence === 'SEMIMONTHLY' ? (
        <div className="field-grid two-up">
          <div className="field">
            <label htmlFor="recurring-first-payment-day">First day of month</label>
            <input
              id="recurring-first-payment-day"
              type="number"
              min={1}
              max={31}
              value={values.firstPaymentDay}
              disabled={submitting}
              aria-invalid={merged.firstPaymentDay ? true : undefined}
              aria-describedby={merged.firstPaymentDay ? 'recurring-first-payment-day-error' : undefined}
              onChange={(event) =>
                setValues((current) => ({ ...current, firstPaymentDay: event.target.value }))
              }
            />
            {merged.firstPaymentDay ? (
              <p id="recurring-first-payment-day-error" className="field-error" role="alert">
                {merged.firstPaymentDay}
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="recurring-second-payment-day">Second day of month</label>
            <input
              id="recurring-second-payment-day"
              type="number"
              min={1}
              max={31}
              value={values.secondPaymentDay}
              disabled={submitting}
              aria-invalid={merged.secondPaymentDay ? true : undefined}
              aria-describedby={
                merged.secondPaymentDay ? 'recurring-second-payment-day-error' : undefined
              }
              onChange={(event) =>
                setValues((current) => ({ ...current, secondPaymentDay: event.target.value }))
              }
            />
            {merged.secondPaymentDay ? (
              <p id="recurring-second-payment-day-error" className="field-error" role="alert">
                {merged.secondPaymentDay}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="recurring-next-payment-date">Next payment date</label>
        <input
          id="recurring-next-payment-date"
          type="date"
          value={values.nextPaymentDate}
          disabled={submitting}
          aria-invalid={merged.nextPaymentDate ? true : undefined}
          aria-describedby={merged.nextPaymentDate ? 'recurring-next-payment-date-error' : undefined}
          onChange={(event) =>
            setValues((current) => ({ ...current, nextPaymentDate: event.target.value }))
          }
        />
        <p className="field-hint">Choose the first date this schedule applied. Past dates are allowed.</p>
        <p className="field-hint">
          A past date lets LedgerBloom identify earlier scheduled occurrences. You choose which ones
          should become actual transactions.
        </p>
        {merged.nextPaymentDate ? (
          <p id="recurring-next-payment-date-error" className="field-error" role="alert">
            {merged.nextPaymentDate}
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
                name="recurring-history-mode"
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
                name="recurring-history-mode"
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
                    idPrefix="recurring-occurrence"
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
        <label htmlFor="recurring-active">
          <input
            id="recurring-active"
            type="checkbox"
            checked={values.active}
            disabled={submitting}
            onChange={(event) => setValues((current) => ({ ...current, active: event.target.checked }))}
          />{' '}
          Active
        </label>
      </div>

      <div className="field">
        <label htmlFor="recurring-notes">Notes</label>
        <textarea
          id="recurring-notes"
          name="recurringExpenseNotes"
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
              ? 'Create recurring expense'
              : 'Save changes'}
        </button>
        <button type="button" className="button button-secondary" disabled={submitting} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
