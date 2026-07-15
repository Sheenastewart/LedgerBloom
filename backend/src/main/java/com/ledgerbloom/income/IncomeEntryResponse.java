package com.ledgerbloom.income;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record IncomeEntryResponse(
		Long id,
		String description,
		String source,
		BigDecimal amount,
		LocalDate incomeDate,
		String notes,
		Instant createdAt,
		Instant updatedAt
) {
}
