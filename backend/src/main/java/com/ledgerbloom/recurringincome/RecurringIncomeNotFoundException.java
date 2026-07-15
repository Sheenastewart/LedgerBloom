package com.ledgerbloom.recurringincome;

public class RecurringIncomeNotFoundException extends RuntimeException {

	public RecurringIncomeNotFoundException(Long id) {
		super("Recurring income not found: " + id);
	}
}
