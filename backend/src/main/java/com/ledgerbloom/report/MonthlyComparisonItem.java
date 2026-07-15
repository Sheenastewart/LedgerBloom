package com.ledgerbloom.report;

import java.math.BigDecimal;

/**
 * A single month's row within a multi-month comparison or year-to-date report.
 * Budget-related fields are {@code null} when no monthly budget exists for the period.
 */
public record MonthlyComparisonItem(
		int year,
		int month,
		BigDecimal totalIncome,
		BigDecimal totalExpenses,
		BigDecimal netCashFlow,
		long incomeCount,
		long expenseCount,
		BigDecimal budgetLimit,
		BigDecimal remainingBudget,
		BigDecimal budgetPercentUsed,
		Boolean overBudget,
		BigDecimal expectedRecurringIncome,
		BigDecimal expectedRecurringExpenses,
		BigDecimal projectedCashFlow
) {
}
