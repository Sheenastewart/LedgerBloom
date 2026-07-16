/**
 * Plain-language definitions that match LedgerBloom’s actual reporting calculations.
 * Keep these aligned with backend report/dashboard math.
 */
export const CALCULATION_DEFS = {
  netCashFlow: {
    title: 'Net cash flow',
    short: 'Actual income minus actual expenses.',
    detail:
      'Net cash flow is calculated from saved Income and Expense entries only. It does not include recurring schedules until those are confirmed as actual entries.',
  },
  projectedCashFlow: {
    title: 'Projected cash flow',
    short:
      'Actual income plus expected recurring income, minus actual expenses and expected recurring obligations.',
    detail:
      'Projected cash flow combines recorded ledger totals with estimated recurring activity scheduled in the selected period. Projected values are estimates, not guarantees.',
  },
  remainingBudget: {
    title: 'Remaining budget',
    short: 'Monthly budget minus actual expenses.',
    detail:
      'Remaining budget is the month’s total budget limit minus spending from saved Expense entries for that month. Category limits are optional and tracked separately.',
  },
  percentUsed: {
    title: 'Percent used',
    short: 'Actual expenses divided by budget limit, shown as a percentage.',
    detail:
      'Percent used is actual expenses for the month divided by the monthly budget limit, then shown as a percentage. Values at or above 100% mean the budget is fully used or overspent.',
  },
  expectedIncome: {
    title: 'Expected income',
    short:
      'Active recurring income scheduled in the selected period but not yet recorded as actual income.',
    detail:
      'Expected income sums active recurring income schedules whose next expected date falls in the selected month. Amounts are estimates until Mark Received creates a real income entry.',
  },
  expectedObligations: {
    title: 'Expected obligations',
    short:
      'Active recurring expenses scheduled in the selected period but not yet recorded as actual expenses.',
    detail:
      'Expected obligations sum active recurring expense schedules whose next expected payment date falls in the selected month. Amounts are estimates until Mark Paid creates a real expense.',
  },
  yearToDateAverage: {
    title: 'Year-to-date average',
    short:
      'The average monthly amount across the months included in the selected year-to-date period.',
    detail:
      'For the current year, year-to-date averages use January through the current month. For past years, they use all twelve months. Future years are not reported.',
  },
  budgetStatus: {
    title: 'Budget status',
    short: 'On track, near budget, or over budget based on percent used.',
    detail:
      'On track means spending is below 80% of the limit. Near budget means 80% or more used but not over. Over budget means spending exceeds the limit.',
  },
  categoryBudgetLimit: {
    title: 'Category budget limit',
    short: 'An optional spending ceiling for one category within the month.',
    detail:
      'Category limits help plan spending within a category. They do not replace the overall monthly budget. Actual category spending comes from saved expenses assigned to that category.',
  },
  cadence: {
    title: 'Cadence',
    short: 'How often a recurring schedule repeats.',
    detail:
      'Cadence sets the repeat interval (for example weekly or monthly). LedgerBloom advances the next expected date when you confirm Mark Paid or Mark Received.',
  },
  markPaid: {
    title: 'Mark Paid',
    short: 'Turns a due recurring expense schedule into a real expense entry.',
    detail:
      'Mark Paid creates a saved Expense from the recurring schedule for the expected payment date and advances the next expected date. The schedule itself is not an expense until confirmed.',
  },
  markReceived: {
    title: 'Mark Received',
    short: 'Turns a due recurring income schedule into a real income entry.',
    detail:
      'Mark Received creates a saved Income entry from the recurring schedule for the expected date and advances the next expected date. The schedule itself is not income until confirmed.',
  },
  actualVsProjected: {
    title: 'Actual vs projected',
    short: 'Actual values come from saved ledger entries; projected values add recurring estimates.',
    detail:
      'Actual income and expenses come only from Income and Expense rows. Projected figures also include expected recurring income and obligations for the selected period.',
  },
} as const

export type CalculationDefKey = keyof typeof CALCULATION_DEFS
