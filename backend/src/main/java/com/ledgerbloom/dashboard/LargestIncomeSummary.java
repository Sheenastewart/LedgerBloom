package com.ledgerbloom.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LargestIncomeSummary(
		Long id,
		String description,
		BigDecimal amount,
		LocalDate incomeDate,
		String source) {
}
