package com.ledgerbloom.dashboard;

import java.math.BigDecimal;

public record SourceIncomeTotal(
		String source,
		BigDecimal total,
		long entryCount) {
}
