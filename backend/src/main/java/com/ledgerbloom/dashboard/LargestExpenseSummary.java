package com.ledgerbloom.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LargestExpenseSummary(
		Long id,
		String description,
		BigDecimal amount,
		LocalDate expenseDate,
		String categoryName) {
}
