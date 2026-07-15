package com.ledgerbloom.budget;

public class CategoryBudgetAlreadyExistsException extends RuntimeException {

	public CategoryBudgetAlreadyExistsException(Long budgetId, Long categoryId) {
		super("A category budget limit already exists for category " + categoryId + " on budget " + budgetId);
	}
}
