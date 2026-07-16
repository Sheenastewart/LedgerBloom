package com.ledgerbloom.income;

public class IncomeEntryNotLinkedToRecurringIncomeException extends RuntimeException {

	public IncomeEntryNotLinkedToRecurringIncomeException(Long incomeEntryId) {
		super("Income entry " + incomeEntryId + " is not linked to a recurring income schedule");
	}
}
