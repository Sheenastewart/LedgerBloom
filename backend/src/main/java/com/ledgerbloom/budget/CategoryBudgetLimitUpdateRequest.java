package com.ledgerbloom.budget;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record CategoryBudgetLimitUpdateRequest(
		@NotNull(message = "Limit amount is required")
		@Positive(message = "Limit amount must be greater than zero")
		@Digits(integer = 10, fraction = 2, message = "Limit amount must fit NUMERIC(12,2)")
		BigDecimal limitAmount
) {
}
