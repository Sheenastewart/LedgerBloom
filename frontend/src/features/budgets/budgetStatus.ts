import type { BudgetStatus } from './types'

/** Near budget: percent used is at least 80% and not over 100%. */
export const NEAR_BUDGET_THRESHOLD = 80

export function budgetStatus(overBudget: boolean, percentUsed: number): BudgetStatus {
  if (overBudget) {
    return 'over-budget'
  }
  if (percentUsed >= NEAR_BUDGET_THRESHOLD) {
    return 'near-budget'
  }
  return 'on-track'
}

export function budgetStatusLabel(status: BudgetStatus): string {
  switch (status) {
    case 'over-budget':
      return 'Over budget'
    case 'near-budget':
      return 'Near budget'
    case 'on-track':
      return 'On track'
  }
}
