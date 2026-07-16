import { formatCurrency } from './moneyUtils'

export type Cadence =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUAL'
  | 'ANNUAL'
  | 'SEMIMONTHLY'

/**
 * How many times a cadence hits in a typical month.
 * Only cadences that fire more than once per month are scaled up;
 * monthly and less-frequent schedules stay at their exact charge.
 */
const MONTHLY_MULTIPLIER: Partial<Record<Cadence, number>> = {
  WEEKLY: 4,
  BIWEEKLY: 2,
  SEMIMONTHLY: 2,
}

/** True when this cadence needs to be multiplied into a monthly total. */
export function isSubMonthlyCadence(cadence: Cadence): boolean {
  return cadence in MONTHLY_MULTIPLIER
}

/**
 * Amount to show on recurring schedule lists.
 * Weekly / biweekly / twice-a-month are scaled to a monthly total;
 * everything else stays exact.
 */
export function displayRecurringAmount(amount: number, cadence: Cadence): number {
  return amount * (MONTHLY_MULTIPLIER[cadence] ?? 1)
}

/** e.g. "$10.00 each" for the real per-occurrence charge when we show a monthly total. */
export function perOccurrenceLabel(amount: number, cadence: Cadence): string | null {
  if (!isSubMonthlyCadence(cadence)) {
    return null
  }
  if (cadence === 'WEEKLY') {
    return `${formatCurrency(amount)} each week`
  }
  if (cadence === 'BIWEEKLY') {
    return `${formatCurrency(amount)} every 2 weeks`
  }
  return `${formatCurrency(amount)} each`
}
