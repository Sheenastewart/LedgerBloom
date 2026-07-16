package com.ledgerbloom.budget;

public class BudgetGroupAlreadyExistsException extends RuntimeException {

	public BudgetGroupAlreadyExistsException(Long budgetId, BudgetGroup group) {
		super("Budget " + budgetId + " already has a limit for group " + group.name());
	}
}
