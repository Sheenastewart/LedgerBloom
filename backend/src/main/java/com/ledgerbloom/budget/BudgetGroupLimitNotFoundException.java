package com.ledgerbloom.budget;

public class BudgetGroupLimitNotFoundException extends RuntimeException {

	public BudgetGroupLimitNotFoundException(Long budgetId, Long limitId) {
		super("Budget group limit " + limitId + " was not found on budget " + budgetId);
	}
}
