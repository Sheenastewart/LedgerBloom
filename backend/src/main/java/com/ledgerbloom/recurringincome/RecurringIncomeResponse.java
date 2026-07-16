package com.ledgerbloom.recurringincome;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record RecurringIncomeResponse(
		Long id,
		String description,
		String source,
		BigDecimal amount,
		RecurringIncomeCadence cadence,
		LocalDate nextIncomeDate,
		boolean active,
		String notes,
		Instant createdAt,
		Instant updatedAt,
		Integer firstPaymentDay,
		Integer secondPaymentDay
) {
}
