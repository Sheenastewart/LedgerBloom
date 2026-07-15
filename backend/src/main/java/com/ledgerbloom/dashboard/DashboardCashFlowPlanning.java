package com.ledgerbloom.dashboard;

import java.math.BigDecimal;
import java.util.List;

/**
 * Forward-looking schedule estimates for the selected month.
 * Expected totals use active recurring items whose next schedule date falls in the month.
 * After mark-received/paid advances a date outside the month, that item is no longer counted (no double-count).
 */
public record DashboardCashFlowPlanning(
		BigDecimal expectedIncome,
		BigDecimal expectedExpenses,
		BigDecimal projectedCashFlow,
		long upcomingIncomeCount,
		long upcomingExpenseCount,
		List<DashboardUpcomingIncomeItem> upcomingIncomeItems,
		List<DashboardUpcomingExpenseItem> upcomingExpenseItems
) {
}
