package com.ledgerbloom.recurring;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/**
 * Required expectedNextPaymentDate must match the locked row's current nextPaymentDate.
 * A mismatch returns 409 RECURRING_EXPENSE_PAYMENT_CONFLICT (stale / duplicate submission).
 */
public record MarkPaidRequest(
		@NotNull(message = "expectedNextPaymentDate is required")
		LocalDate expectedNextPaymentDate
) {
}
