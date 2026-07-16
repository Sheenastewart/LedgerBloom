package com.ledgerbloom.recurring;

import com.ledgerbloom.expense.ExpenseResponse;
import java.time.LocalDate;
import java.util.List;

public record RecurringExpenseCatchUpResponse(
		int createdCount,
		List<LocalDate> createdDates,
		LocalDate nextOccurrenceDate,
		RecurringExpenseResponse updatedRecurringExpense,
		List<ExpenseResponse> createdExpenses
) {
}
