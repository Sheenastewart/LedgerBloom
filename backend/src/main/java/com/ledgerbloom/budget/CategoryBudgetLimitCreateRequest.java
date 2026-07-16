package com.ledgerbloom.budget;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record CategoryBudgetLimitCreateRequest(
		@NotNull(message = "Category id is required")
		@Positive(message = "Category id must be positive")
		Long categoryId,

		@NotNull(message = "Limit amount is required")
		@Positive(message = "Limit amount must be greater than zero")
		@Digits(integer = 10, fraction = 2, message = "Limit amount must fit NUMERIC(12,2)")
		BigDecimal limitAmount,

		@DecimalMin(value = "0.00", message = "Assistance amount must be zero or greater")
		@Digits(integer = 10, fraction = 2, message = "Assistance amount must fit NUMERIC(12,2)")
		BigDecimal assistanceAmount
) {
}
