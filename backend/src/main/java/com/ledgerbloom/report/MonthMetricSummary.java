package com.ledgerbloom.report;

import java.math.BigDecimal;

/**
 * Identifies the month within a report range that produced an extreme (highest/lowest) value
 * for a particular metric (income, expenses, or net cash flow).
 */
public record MonthMetricSummary(
		int year,
		int month,
		BigDecimal value
) {
}
