package com.ledgerbloom.dashboard;

import java.math.BigDecimal;

public record DashboardBudgetSummary(
		Long id,
		BigDecimal totalLimit,
		BigDecimal actualExpenses,
		BigDecimal remaining,
		BigDecimal percentUsed,
		boolean overBudget
) {
}
