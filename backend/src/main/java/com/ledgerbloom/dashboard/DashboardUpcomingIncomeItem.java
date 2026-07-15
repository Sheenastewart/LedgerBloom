package com.ledgerbloom.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DashboardUpcomingIncomeItem(
		Long id,
		String description,
		String source,
		BigDecimal amount,
		LocalDate nextIncomeDate,
		String cadence
) {
}
