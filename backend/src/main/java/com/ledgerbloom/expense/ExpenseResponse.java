package com.ledgerbloom.expense;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record ExpenseResponse(
		Long id,
		String description,
		String merchant,
		BigDecimal amount,
		LocalDate expenseDate,
		ExpenseCategorySummary category,
		String notes,
		Instant createdAt,
		Instant updatedAt
) {
}
