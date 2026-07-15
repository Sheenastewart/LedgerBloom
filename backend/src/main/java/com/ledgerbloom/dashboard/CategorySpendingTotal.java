package com.ledgerbloom.dashboard;

import java.math.BigDecimal;

public record CategorySpendingTotal(
		Long categoryId,
		String categoryName,
		BigDecimal total,
		long entryCount) {
}
