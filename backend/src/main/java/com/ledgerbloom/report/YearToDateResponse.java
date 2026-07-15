package com.ledgerbloom.report;

import com.ledgerbloom.dashboard.CategorySpendingTotal;
import com.ledgerbloom.dashboard.SourceIncomeTotal;
import java.math.BigDecimal;
import java.util.List;

/**
 * Year-to-date report aggregating January through either December (past years) or the
 * current month (the current year). {@code highestIncomeMonth}, {@code highestExpenseMonth},
 * {@code bestNetCashFlowMonth}, and {@code worstNetCashFlowMonth} are {@code null} only if
 * {@code monthSummaries} is empty, which cannot occur for a valid year.
 */
public record YearToDateResponse(
		int year,
		YearToDateTotals totals,
		YearToDateAverages averages,
		MonthMetricSummary highestIncomeMonth,
		MonthMetricSummary highestExpenseMonth,
		MonthMetricSummary bestNetCashFlowMonth,
		MonthMetricSummary worstNetCashFlowMonth,
		BigDecimal totalBudgeted,
		BigDecimal totalBudgetRemaining,
		long monthsOverBudget,
		List<CategorySpendingTotal> spendingByCategory,
		List<SourceIncomeTotal> incomeBySource,
		List<MonthlyComparisonItem> monthSummaries
) {
}
