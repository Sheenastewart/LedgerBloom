package com.ledgerbloom.budget;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record MonthlyBudgetCreateRequest(
		@NotNull(message = "Year is required")
		@Positive(message = "Year must be a positive value")
		@Max(value = 9999, message = "Year must be at most 9999")
		Integer year,

		@NotNull(message = "Month is required")
		@Min(value = 1, message = "Month must be between 1 and 12")
		@Max(value = 12, message = "Month must be between 1 and 12")
		Integer month,

		@NotNull(message = "Total limit is required")
		@Positive(message = "Total limit must be greater than zero")
		@Digits(integer = 10, fraction = 2, message = "Total limit must fit NUMERIC(12,2)")
		BigDecimal totalLimit
) {
}
