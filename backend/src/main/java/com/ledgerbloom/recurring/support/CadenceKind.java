package com.ledgerbloom.recurring.support;

/**
 * Shared cadence kinds for schedule math (mirrors income/expense JPA enums including SEMIMONTHLY).
 */
public enum CadenceKind {
	WEEKLY,
	BIWEEKLY,
	MONTHLY,
	QUARTERLY,
	SEMIANNUAL,
	ANNUAL,
	SEMIMONTHLY;

	public static CadenceKind fromIncome(com.ledgerbloom.recurringincome.RecurringIncomeCadence cadence) {
		return CadenceKind.valueOf(cadence.name());
	}

	public static CadenceKind fromExpense(com.ledgerbloom.recurring.RecurringExpenseCadence cadence) {
		return CadenceKind.valueOf(cadence.name());
	}
}
