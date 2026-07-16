package com.ledgerbloom.recurringincome;

import com.ledgerbloom.income.IncomeEntryResponse;
import java.time.LocalDate;
import java.util.List;

public record RecurringIncomeCatchUpResponse(
		int createdCount,
		List<LocalDate> createdDates,
		LocalDate nextOccurrenceDate,
		RecurringIncomeResponse updatedRecurringIncome,
		List<IncomeEntryResponse> createdIncomeEntries
) {
}
