package com.ledgerbloom.report;

import java.math.BigDecimal;

public record YearToDateAverages(
		BigDecimal averageIncome,
		BigDecimal averageExpenses,
		BigDecimal averageNetCashFlow
) {
}
