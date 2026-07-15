package com.ledgerbloom.income;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record IncomeEntryUpdateRequest(
		@NotBlank(message = "Description is required")
		@Size(max = 160, message = "Description must be at most 160 characters")
		String description,

		@NotBlank(message = "Source is required")
		@Size(max = 120, message = "Source must be at most 120 characters")
		String source,

		@NotNull(message = "Amount is required")
		@Positive(message = "Amount must be greater than zero")
		@Digits(integer = 10, fraction = 2, message = "Amount must fit NUMERIC(12,2)")
		BigDecimal amount,

		@NotNull(message = "Income date is required")
		LocalDate incomeDate,

		String notes
) {
}
