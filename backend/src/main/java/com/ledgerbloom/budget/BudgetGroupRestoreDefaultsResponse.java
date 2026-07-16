package com.ledgerbloom.budget;

import java.util.List;

/**
 * Result of restoring missing preset budget groups without changing existing limits.
 */
public record BudgetGroupRestoreDefaultsResponse(
		MonthlyBudgetResponse budget,
		List<BudgetGroupSummary> restored,
		List<BudgetGroupSummary> skipped
) {
}
