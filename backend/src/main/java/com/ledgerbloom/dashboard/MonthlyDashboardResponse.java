package com.ledgerbloom.dashboard;

import java.math.BigDecimal;
import java.util.List;

public record MonthlyDashboardResponse(
		int year,
		int month,
		BigDecimal totalIncome,
		BigDecimal totalExpenses,
		BigDecimal netCashFlow,
		long incomeEntryCount,
		long expenseEntryCount,
		List<CategorySpendingTotal> spendingByCategory,
		List<SourceIncomeTotal> incomeBySource,
		LargestExpenseSummary largestExpense,
		LargestIncomeSummary largestIncome,
		DashboardBudgetSummary budget,
		DashboardCashFlowPlanning planning
) {
}
