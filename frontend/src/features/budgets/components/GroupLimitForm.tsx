import { useState, type FormEvent } from 'react'
import {
  amountToRequestValue,
  normalizeAmountInput,
  validateAmount,
} from '../../../utils/moneyUtils'
import {
  BUDGET_GROUPS,
  type GroupLimitCreateRequest,
  type GroupLimitFormErrors,
  type GroupLimitFormValues,
  type GroupLimitUpdateRequest,
} from '../types'

type GroupLimitFormProps = {
  mode: 'create' | 'edit'
  initialValues: GroupLimitFormValues
  serverErrors?: GroupLimitFormErrors
  submitting?: boolean
  onSubmit: (values: GroupLimitFormValues) => void
  onCancel: () => void
}

const AMOUNT_PATTERN = /^(\d{1,10})(\.\d{1,2})?$/

function validateAssistanceAmount(amount: string): string | undefined {
  const normalized = normalizeAmountInput(amount)
  if (!normalized) return undefined
  return AMOUNT_PATTERN.test(normalized) ? undefined : 'Enter a valid assistance amount'
}

function assistanceToRequestValue(amount: string): number {
  const normalized = normalizeAmountInput(amount)
  return normalized ? amountToRequestValue(normalized) : 0
}

function validateValues(values: GroupLimitFormValues, mode: 'create' | 'edit'): GroupLimitFormErrors {
  const errors: GroupLimitFormErrors = {}
  if (mode === 'create' && !BUDGET_GROUPS.some((group) => group.key === values.budgetGroup)) {
    errors.budgetGroup = 'Select a budget group.'
  }
  const amountError = validateAmount(values.limitAmount)
  if (amountError) errors.limitAmount = amountError
  const assistanceError = validateAssistanceAmount(values.assistanceAmount)
  if (assistanceError) errors.assistanceAmount = assistanceError
  return errors
}

export function toGroupLimitCreateRequest(values: GroupLimitFormValues): GroupLimitCreateRequest {
  return {
    budgetGroup: values.budgetGroup as GroupLimitCreateRequest['budgetGroup'],
    limitAmount: amountToRequestValue(normalizeAmountInput(values.limitAmount)),
    assistanceAmount: assistanceToRequestValue(values.assistanceAmount),
  }
}

export function toGroupLimitUpdateRequest(values: GroupLimitFormValues): GroupLimitUpdateRequest {
  return {
    limitAmount: amountToRequestValue(normalizeAmountInput(values.limitAmount)),
    assistanceAmount: assistanceToRequestValue(values.assistanceAmount),
  }
}

export function GroupLimitForm({
  mode,
  initialValues,
  serverErrors = {},
  submitting = false,
  onSubmit,
  onCancel,
}: GroupLimitFormProps) {
  const [values, setValues] = useState<GroupLimitFormValues>(initialValues)
  const [errors, setErrors] = useState<GroupLimitFormErrors>({})
  const merged = { ...errors, ...serverErrors }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateValues(values, mode)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) onSubmit(values)
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit} noValidate>
      {merged.form ? <p className="form-error" role="alert">{merged.form}</p> : null}

      <div className="field">
        <label htmlFor="group-limit-group">Budget group</label>
        {mode === 'create' ? (
          <select
            id="group-limit-group"
            value={values.budgetGroup}
            disabled={submitting}
            aria-invalid={merged.budgetGroup ? true : undefined}
            aria-describedby={merged.budgetGroup ? 'group-limit-group-error' : undefined}
            onChange={(event) => setValues((current) => ({ ...current, budgetGroup: event.target.value }))}
          >
            <option value="">Select budget group</option>
            {BUDGET_GROUPS.map((group) => <option key={group.key} value={group.key}>{group.label}</option>)}
          </select>
        ) : (
          <input id="group-limit-group" value={BUDGET_GROUPS.find((group) => group.key === values.budgetGroup)?.label ?? values.budgetGroup} readOnly />
        )}
        {merged.budgetGroup ? <p id="group-limit-group-error" className="field-error" role="alert">{merged.budgetGroup}</p> : null}
      </div>

      <div className="field">
        <label htmlFor="group-limit-amount">Limit amount</label>
        <input id="group-limit-amount" type="text" inputMode="decimal" value={values.limitAmount} disabled={submitting} aria-invalid={merged.limitAmount ? true : undefined} aria-describedby={merged.limitAmount ? 'group-limit-amount-error' : undefined} onChange={(event) => setValues((current) => ({ ...current, limitAmount: event.target.value }))} />
        {merged.limitAmount ? <p id="group-limit-amount-error" className="field-error" role="alert">{merged.limitAmount}</p> : null}
      </div>

      <div className="field">
        <label htmlFor="group-limit-assistance">Assistance amount</label>
        <input id="group-limit-assistance" type="text" inputMode="decimal" value={values.assistanceAmount} disabled={submitting} aria-invalid={merged.assistanceAmount ? true : undefined} aria-describedby={merged.assistanceAmount ? 'group-limit-assistance-error' : 'group-limit-assistance-hint'} onChange={(event) => setValues((current) => ({ ...current, assistanceAmount: event.target.value }))} />
        <p id="group-limit-assistance-hint" className="field-hint">Optional. Covered spending in this group does not count toward this limit or the overall budget.</p>
        {merged.assistanceAmount ? <p id="group-limit-assistance-error" className="field-error" role="alert">{merged.assistanceAmount}</p> : null}
      </div>

      <div className="form-actions">
        <button type="submit" className="button button-primary" disabled={submitting}>{submitting ? 'Saving…' : mode === 'create' ? 'Save group limit' : 'Save limit'}</button>
        <button type="button" className="button button-secondary" disabled={submitting} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
