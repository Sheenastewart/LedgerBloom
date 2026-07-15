package com.ledgerbloom.recurring;

public class RecurringExpenseNotFoundException extends RuntimeException {

	public RecurringExpenseNotFoundException(Long id) {
		super("Recurring expense not found: " + id);
	}
}
