package com.ledgerbloom.budget;

public record BudgetGroupSummary(
		String key,
		String label
) {
	public static BudgetGroupSummary from(BudgetGroup group) {
		return new BudgetGroupSummary(group.name(), group.getLabel());
	}
}
