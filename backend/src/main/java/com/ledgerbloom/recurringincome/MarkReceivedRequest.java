package com.ledgerbloom.recurringincome;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/**
 * Required expectedNextIncomeDate must match the locked row's current nextIncomeDate.
 * A mismatch returns 409 RECURRING_INCOME_RECEIPT_CONFLICT (stale / duplicate submission).
 */
public record MarkReceivedRequest(
		@NotNull(message = "expectedNextIncomeDate is required")
		LocalDate expectedNextIncomeDate
) {
}
