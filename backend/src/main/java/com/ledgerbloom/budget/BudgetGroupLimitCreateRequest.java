package com.ledgerbloom.budget;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record BudgetGroupLimitCreateRequest(
		@NotBlank(message = "Budget group is required")
		String budgetGroup,

		@NotNull(message = "Limit amount is required")
		@DecimalMin(value = "0.01", message = "Limit amount must be greater than zero")
		@Digits(integer = 10, fraction = 2, message = "Limit amount must have at most 2 decimal places")
		BigDecimal limitAmount,

		@DecimalMin(value = "0.00", message = "Assistance amount must be zero or greater")
		@Digits(integer = 10, fraction = 2, message = "Assistance amount must have at most 2 decimal places")
		BigDecimal assistanceAmount
) {
}
