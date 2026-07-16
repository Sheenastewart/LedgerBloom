package com.ledgerbloom.income;

import java.time.LocalDate;

public record UndoReceivedResponse(
		Long removedIncomeEntryId,
		LocalDate occurrenceDate,
		boolean scheduleRestored,
		LocalDate nextIncomeDate,
		Long recurringIncomeId
) {
}
