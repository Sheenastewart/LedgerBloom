package com.ledgerbloom.budget;

import java.math.BigDecimal;

public record CategoryBudgetLimitResponse(
		Long id,
		BudgetCategorySummary category,
		BigDecimal limitAmount,
		BigDecimal actualSpent,
		BigDecimal remaining,
		BigDecimal percentUsed,
		boolean overBudget
) {
}
