package com.ledgerbloom.budget;

public class MonthlyBudgetNotFoundException extends RuntimeException {

	public MonthlyBudgetNotFoundException(Long id) {
		super("Monthly budget not found: " + id);
	}

	public MonthlyBudgetNotFoundException(Integer year, Integer month) {
		super("Monthly budget not found for " + year + "-" + month);
	}
}
