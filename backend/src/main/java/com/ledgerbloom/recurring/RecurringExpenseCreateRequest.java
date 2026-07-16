package com.ledgerbloom.recurring;

import com.ledgerbloom.recurring.support.HistorySetupMode;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record RecurringExpenseCreateRequest(
		@Size(max = 160, message = "Description must be at most 160 characters")
		String description,

		@Size(max = 120, message = "Merchant must be at most 120 characters")
		String merchant,

		@NotNull(message = "Amount is required")
		@Positive(message = "Amount must be greater than zero")
		@Digits(integer = 10, fraction = 2, message = "Amount must fit NUMERIC(12,2)")
		BigDecimal amount,

		@NotNull(message = "Category ID is required")
		@Positive(message = "Category ID must be positive")
		Long categoryId,

		@NotNull(message = "Cadence is required")
		RecurringExpenseCadence cadence,

		@NotNull(message = "Next payment date is required")
		LocalDate nextPaymentDate,

		@NotNull(message = "Active is required")
		Boolean active,

		String notes,

		@Min(value = 1, message = "firstPaymentDay must be between 1 and 31")
		@Max(value = 31, message = "firstPaymentDay must be between 1 and 31")
		Integer firstPaymentDay,

		@Min(value = 1, message = "secondPaymentDay must be between 1 and 31")
		@Max(value = 31, message = "secondPaymentDay must be between 1 and 31")
		Integer secondPaymentDay,

		HistorySetupMode historyMode,

		List<LocalDate> selectedOccurrenceDates
) {
}
