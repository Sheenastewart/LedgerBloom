package com.ledgerbloom.recurring;

import com.ledgerbloom.expense.ExpenseResponse;

public record MarkPaidResponse(
		ExpenseResponse createdExpense,
		RecurringExpenseResponse updatedRecurringExpense
) {
}
