package com.ledgerbloom.recurring;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record RecurringExpenseResponse(
		Long id,
		String description,
		String merchant,
		BigDecimal amount,
		RecurringExpenseCategorySummary category,
		RecurringExpenseCadence cadence,
		LocalDate nextPaymentDate,
		boolean active,
		String notes,
		Instant createdAt,
		Instant updatedAt,
		Integer firstPaymentDay,
		Integer secondPaymentDay
) {
}
