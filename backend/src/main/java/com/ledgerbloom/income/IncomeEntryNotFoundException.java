package com.ledgerbloom.income;

public class IncomeEntryNotFoundException extends RuntimeException {

	public IncomeEntryNotFoundException(Long id) {
		super("Income entry not found: " + id);
	}
}
