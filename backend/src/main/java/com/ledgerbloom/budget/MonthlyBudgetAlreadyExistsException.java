package com.ledgerbloom.budget;

public class MonthlyBudgetAlreadyExistsException extends RuntimeException {

	public MonthlyBudgetAlreadyExistsException(Integer year, Integer month) {
		super("A monthly budget already exists for " + year + "-" + month);
	}
}
