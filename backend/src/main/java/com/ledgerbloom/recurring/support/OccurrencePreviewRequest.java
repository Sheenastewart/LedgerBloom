package com.ledgerbloom.recurring.support;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Shared preview request body for both recurring income and recurring expense schedules.
 * {@code startDate} is the schedule's start / next-due date field being previewed.
 */
public record OccurrencePreviewRequest(
		@NotNull(message = "Cadence is required")
		CadenceKind cadence,

		@NotNull(message = "Start date is required")
		LocalDate startDate,

		@NotNull(message = "Amount is required")
		@Positive(message = "Amount must be greater than zero")
		@Digits(integer = 10, fraction = 2, message = "Amount must fit NUMERIC(12,2)")
		BigDecimal amount,

		@Min(value = 1, message = "firstPaymentDay must be between 1 and 31")
		@Max(value = 31, message = "firstPaymentDay must be between 1 and 31")
		Integer firstPaymentDay,

		@Min(value = 1, message = "secondPaymentDay must be between 1 and 31")
		@Max(value = 31, message = "secondPaymentDay must be between 1 and 31")
		Integer secondPaymentDay
) {
}
