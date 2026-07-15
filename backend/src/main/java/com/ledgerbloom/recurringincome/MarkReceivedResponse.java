package com.ledgerbloom.recurringincome;

import com.ledgerbloom.income.IncomeEntryResponse;

public record MarkReceivedResponse(
		IncomeEntryResponse createdIncomeEntry,
		RecurringIncomeResponse updatedRecurringIncome
) {
}
