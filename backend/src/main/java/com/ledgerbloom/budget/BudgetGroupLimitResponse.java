package com.ledgerbloom.budget;

import java.math.BigDecimal;

public record BudgetGroupLimitResponse(
		Long id,
		BudgetGroupSummary group,
		BigDecimal limitAmount,
		BigDecimal assistanceAmount,
		BigDecimal actualSpent,
		BigDecimal budgetableSpent,
		BigDecimal remaining,
		BigDecimal percentUsed,
		boolean overBudget
) {
}
