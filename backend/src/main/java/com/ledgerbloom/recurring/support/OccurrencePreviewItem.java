package com.ledgerbloom.recurring.support;

import java.math.BigDecimal;
import java.time.LocalDate;

public record OccurrencePreviewItem(
		LocalDate occurrenceDate,
		BigDecimal amount
) {
}
