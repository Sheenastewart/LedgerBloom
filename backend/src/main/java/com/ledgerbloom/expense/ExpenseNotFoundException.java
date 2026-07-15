package com.ledgerbloom.expense;

public class ExpenseNotFoundException extends RuntimeException {

	public ExpenseNotFoundException(Long id) {
		super("Expense not found: " + id);
	}
}
