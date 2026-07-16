package com.ledgerbloom.recurring.support;

import jakarta.validation.constraints.NotEmpty;
import java.time.LocalDate;
import java.util.List;

/**
 * Shared catch-up request body for both recurring income and recurring expense schedules.
 * {@code occurrenceDates} must be a non-empty subset of the currently allowed (overdue) dates.
 */
public record CatchUpRequest(
		@NotEmpty(message = "occurrenceDates must include at least one date")
		List<LocalDate> occurrenceDates
) {
}
