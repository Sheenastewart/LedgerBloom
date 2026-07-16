package com.ledgerbloom.recurring.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.function.UnaryOperator;
import org.junit.jupiter.api.Test;

class RecurringOccurrenceProjectorTest {

	private static final UnaryOperator<LocalDate> WEEKLY = date -> date.plusWeeks(1);
	private static final UnaryOperator<LocalDate> BIWEEKLY = date -> date.plusWeeks(2);
	private static final UnaryOperator<LocalDate> MONTHLY = date -> date.plusMonths(1);

	@Test
	void monthlyScheduleCountsOneOccurrenceInSelectedMonth() {
		LocalDate next = LocalDate.of(2026, 7, 15);
		LocalDate start = LocalDate.of(2026, 7, 1);
		LocalDate end = LocalDate.of(2026, 7, 31);

		assertEquals(1, RecurringOccurrenceProjector.countInPeriod(next, start, end, MONTHLY));
		assertEquals(
			new BigDecimal("100.00"),
			RecurringOccurrenceProjector.amountInPeriod(next, new BigDecimal("100.00"), start, end, MONTHLY)
		);
	}

	@Test
	void weeklyScheduleCountsFourOrFiveDependingOnCalendar() {
		// July 2026 starts on Wednesday; weekly from July 1 → 1,8,15,22,29 = 5
		LocalDate fiveStart = LocalDate.of(2026, 7, 1);
		assertEquals(
			5,
			RecurringOccurrenceProjector.countInPeriod(
				fiveStart,
				LocalDate.of(2026, 7, 1),
				LocalDate.of(2026, 7, 31),
				WEEKLY
			)
		);

		// Weekly starting July 6 → 6,13,20,27 = 4
		LocalDate fourStart = LocalDate.of(2026, 7, 6);
		assertEquals(
			4,
			RecurringOccurrenceProjector.countInPeriod(
				fourStart,
				LocalDate.of(2026, 7, 1),
				LocalDate.of(2026, 7, 31),
				WEEKLY
			)
		);
	}

	@Test
	void biweeklyScheduleCountsTwoOrThreeDependingOnCalendar() {
		// Biweekly from July 1 → 1,15,29 = 3
		assertEquals(
			3,
			RecurringOccurrenceProjector.countInPeriod(
				LocalDate.of(2026, 7, 1),
				LocalDate.of(2026, 7, 1),
				LocalDate.of(2026, 7, 31),
				BIWEEKLY
			)
		);

		// Biweekly from July 8 → 8,22 = 2
		assertEquals(
			2,
			RecurringOccurrenceProjector.countInPeriod(
				LocalDate.of(2026, 7, 8),
				LocalDate.of(2026, 7, 1),
				LocalDate.of(2026, 7, 31),
				BIWEEKLY
			)
		);
	}

	@Test
	void datesOutsideMonthAreExcluded() {
		List<LocalDate> dates = RecurringOccurrenceProjector.datesInPeriod(
			LocalDate.of(2026, 6, 24),
			LocalDate.of(2026, 7, 1),
			LocalDate.of(2026, 7, 31),
			WEEKLY
		);
		assertEquals(List.of(
			LocalDate.of(2026, 7, 1),
			LocalDate.of(2026, 7, 8),
			LocalDate.of(2026, 7, 15),
			LocalDate.of(2026, 7, 22),
			LocalDate.of(2026, 7, 29)
		), dates);
		assertTrue(dates.stream().noneMatch(date -> date.getMonthValue() != 7));
	}

	@Test
	void alreadyAdvancedPastOccurrencesAreExcluded() {
		// After mark-received advanced next due to July 15, earlier July dates are not projected.
		LocalDate next = LocalDate.of(2026, 7, 15);
		assertEquals(
			List.of(LocalDate.of(2026, 7, 15), LocalDate.of(2026, 7, 29)),
			RecurringOccurrenceProjector.datesInPeriod(
				next,
				LocalDate.of(2026, 7, 1),
				LocalDate.of(2026, 7, 31),
				BIWEEKLY
			)
		);
		assertEquals(
			List.of(
				LocalDate.of(2026, 7, 15),
				LocalDate.of(2026, 7, 22),
				LocalDate.of(2026, 7, 29)
			),
			RecurringOccurrenceProjector.datesInPeriod(
				next,
				LocalDate.of(2026, 7, 1),
				LocalDate.of(2026, 7, 31),
				WEEKLY
			)
		);
	}

	@Test
	void nextDueAfterMonthYieldsZero() {
		assertEquals(
			0,
			RecurringOccurrenceProjector.countInPeriod(
				LocalDate.of(2026, 8, 1),
				LocalDate.of(2026, 7, 1),
				LocalDate.of(2026, 7, 31),
				MONTHLY
			)
		);
	}
}
