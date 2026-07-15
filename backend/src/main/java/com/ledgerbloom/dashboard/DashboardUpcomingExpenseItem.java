package com.ledgerbloom.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DashboardUpcomingExpenseItem(
		Long id,
		String description,
		String categoryName,
		BigDecimal amount,
		LocalDate nextPaymentDate,
		String cadence
) {
}
