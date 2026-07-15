package com.ledgerbloom.budget;

public class CategoryBudgetLimitNotFoundException extends RuntimeException {

	public CategoryBudgetLimitNotFoundException(Long budgetId, Long limitId) {
		super("Category budget limit not found: " + limitId + " for budget " + budgetId);
	}
}
