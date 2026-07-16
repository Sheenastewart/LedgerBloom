package com.ledgerbloom.recurring.support;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.function.UnaryOperator;

/**
 * Projects recurring schedule occurrences into a closed date range without persisting
 * anything. Starts from the schedule's current next-due date (so already-received /
 * already-paid occurrences that advanced that date are excluded), advances by cadence,
 * and counts only dates that fall inside {@code [periodStart, periodEnd]}.
 */
public final class RecurringOccurrenceProjector {

	/** Safety bound against runaway loops from a bad advance function. */
	static final int MAX_STEPS = 512;

	private RecurringOccurrenceProjector() {
	}

	/**
	 * Returns each occurrence date in the period, in ascending order.
	 */
	public static List<LocalDate> datesInPeriod(
			LocalDate nextDueDate,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive,
			UnaryOperator<LocalDate> advance) {
		Objects.requireNonNull(nextDueDate, "nextDueDate");
		Objects.requireNonNull(periodStartInclusive, "periodStartInclusive");
		Objects.requireNonNull(periodEndInclusive, "periodEndInclusive");
		Objects.requireNonNull(advance, "advance");
		if (periodEndInclusive.isBefore(periodStartInclusive)) {
			return List.of();
		}

		LocalDate cursor = nextDueDate;
		int steps = 0;
		while (cursor.isBefore(periodStartInclusive) && steps < MAX_STEPS) {
			LocalDate advanced = advance.apply(cursor);
			if (advanced == null || !advanced.isAfter(cursor)) {
				throw new IllegalStateException("Cadence advance must move strictly forward");
			}
			cursor = advanced;
			steps++;
		}

		List<LocalDate> dates = new ArrayList<>();
		while (!cursor.isAfter(periodEndInclusive) && steps < MAX_STEPS) {
			if (!cursor.isBefore(periodStartInclusive)) {
				dates.add(cursor);
			}
			LocalDate advanced = advance.apply(cursor);
			if (advanced == null || !advanced.isAfter(cursor)) {
				throw new IllegalStateException("Cadence advance must move strictly forward");
			}
			cursor = advanced;
			steps++;
		}
		return List.copyOf(dates);
	}

	public static int countInPeriod(
			LocalDate nextDueDate,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive,
			UnaryOperator<LocalDate> advance) {
		return datesInPeriod(nextDueDate, periodStartInclusive, periodEndInclusive, advance).size();
	}

	public static BigDecimal amountInPeriod(
			LocalDate nextDueDate,
			BigDecimal amountPerOccurrence,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive,
			UnaryOperator<LocalDate> advance) {
		Objects.requireNonNull(amountPerOccurrence, "amountPerOccurrence");
		int count = countInPeriod(nextDueDate, periodStartInclusive, periodEndInclusive, advance);
		return amountPerOccurrence
			.multiply(BigDecimal.valueOf(count))
			.setScale(2, RoundingMode.HALF_UP);
	}
}
