package com.ledgerbloom.budget;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record MonthlyBudgetGenerateRequest(
		@NotNull(message = "Year is required")
		@Positive(message = "Year must be a positive value")
		@Max(value = 9999, message = "Year must be at most 9999")
		Integer year,

		@NotNull(message = "Month is required")
		@Min(value = 1, message = "Month must be between 1 and 12")
		@Max(value = 12, message = "Month must be between 1 and 12")
		Integer month
) {
}
