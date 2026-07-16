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
		boolean userModified,
		long expenseCount,
		List<BudgetGroupLimitResponse> groupLimits,
		Instant createdAt,
		Instant updatedAt
) {
}
