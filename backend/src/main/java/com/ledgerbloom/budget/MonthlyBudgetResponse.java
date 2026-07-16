package com.ledgerbloom.budget;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record MonthlyBudgetResponse(
		Long id,
		int year,
		int month,
		BigDecimal totalLimit,
		BigDecimal actualExpenses,
		BigDecimal budgetableExpenses,
		BigDecimal assistanceApplied,
		BigDecimal remaining,
		BigDecimal percentUsed,
		boolean overBudget,
		long expenseCount,
		List<CategoryBudgetLimitResponse> categoryLimits,
		Instant createdAt,
		Instant updatedAt
) {
}
