package com.ledgerbloom.recurring;

public class InvalidRecurringExpenseDataException extends RuntimeException {

	public InvalidRecurringExpenseDataException(String message) {
		super(message);
	}
}
