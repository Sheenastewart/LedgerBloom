package com.ledgerbloom.report;

import java.util.List;

public record MonthlyComparisonResponse(
		int startYear,
		int startMonth,
		int endYear,
		int endMonth,
		int monthCount,
		List<MonthlyComparisonItem> months
) {
}
