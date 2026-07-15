package com.ledgerbloom.report;

import java.math.BigDecimal;

public record YearToDateTotals(
		BigDecimal totalIncome,
		BigDecimal totalExpenses,
		BigDecimal netCashFlow
) {
}
