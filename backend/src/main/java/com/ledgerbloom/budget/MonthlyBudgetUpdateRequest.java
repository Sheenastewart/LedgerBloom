package com.ledgerbloom.budget;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record MonthlyBudgetUpdateRequest(
		@NotNull(message = "Total limit is required")
		@Positive(message = "Total limit must be greater than zero")
		@Digits(integer = 10, fraction = 2, message = "Total limit must fit NUMERIC(12,2)")
		BigDecimal totalLimit
) {
}
