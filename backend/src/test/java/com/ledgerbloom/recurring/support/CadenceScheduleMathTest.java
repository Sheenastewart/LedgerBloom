package com.ledgerbloom.recurring.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import org.junit.jupiter.api.Test;

class CadenceScheduleMathTest {

	@Test
	void semimonthlyFirstAndFifteenthProducesBothDates() {
		List<LocalDate> dates = CadenceScheduleMath.occurrencesThrough(
			LocalDate.of(2026, 5, 1),
			LocalDate.of(2026, 6, 15),
			CadenceKind.SEMIMONTHLY,
			1,
			15
		);
		assertEquals(List.of(
			LocalDate.of(2026, 5, 1),
			LocalDate.of(2026, 5, 15),
			LocalDate.of(2026, 6, 1),
			LocalDate.of(2026, 6, 15)
		), dates);
	}

	@Test
	void semimonthlyDiffersFromBiweekly() {
		LocalDate start = LocalDate.of(2026, 5, 1);
		LocalDate end = LocalDate.of(2026, 6, 30);
		List<LocalDate> semi = CadenceScheduleMath.occurrencesThrough(
			start, end, CadenceKind.SEMIMONTHLY, 1, 15
		);
		List<LocalDate> bi = CadenceScheduleMath.occurrencesThrough(
			start, end, CadenceKind.BIWEEKLY, null, null
		);
		assertNotEquals(bi, semi);
		assertEquals(4, semi.size());
		assertTrue(bi.size() >= 4);
	}

	@Test
	void dayThirtyOneUsesMonthEnd() {
		assertEquals(
			LocalDate.of(2026, 2, 28),
			CadenceScheduleMath.dateForDayInMonth(YearMonth.of(2026, 2), 31)
		);
		assertEquals(
			LocalDate.of(2026, 4, 30),
			CadenceScheduleMath.dateForDayInMonth(YearMonth.of(2026, 4), 31)
		);
	}

	@Test
	void sortedPaymentDaysStoresAscending() {
		assertEquals(1, CadenceScheduleMath.sortedPaymentDays(15, 1)[0]);
		assertEquals(15, CadenceScheduleMath.sortedPaymentDays(15, 1)[1]);
	}

	@Test
	void rejectsIdenticalSemimonthlyDays() {
		assertThrows(IllegalArgumentException.class, () -> CadenceScheduleMath.sortedPaymentDays(15, 15));
	}

	@Test
	void pastStartOccurrencesThroughToday() {
		List<LocalDate> dates = CadenceScheduleMath.occurrencesThrough(
			LocalDate.of(2026, 3, 1),
			LocalDate.of(2026, 5, 15),
			CadenceKind.SEMIMONTHLY,
			1,
			15
		);
		assertEquals(6, dates.size());
		assertEquals(LocalDate.of(2026, 3, 1), dates.getFirst());
		assertEquals(LocalDate.of(2026, 5, 15), dates.getLast());
	}

	@Test
	void occurrencesThroughReturnsEmptyWhenEndBeforeStart() {
		List<LocalDate> dates = CadenceScheduleMath.occurrencesThrough(
			LocalDate.of(2026, 6, 1),
			LocalDate.of(2026, 5, 1),
			CadenceKind.MONTHLY,
			null,
			null
		);
		assertTrue(dates.isEmpty());
	}

	@Test
	void advanceHandlesEachNonSemimonthlyCadence() {
		assertEquals(LocalDate.of(2026, 7, 22), CadenceScheduleMath.advance(
			LocalDate.of(2026, 7, 15), CadenceKind.WEEKLY, null, null));
		assertEquals(LocalDate.of(2026, 7, 29), CadenceScheduleMath.advance(
			LocalDate.of(2026, 7, 15), CadenceKind.BIWEEKLY, null, null));
		assertEquals(LocalDate.of(2026, 8, 15), CadenceScheduleMath.advance(
			LocalDate.of(2026, 7, 15), CadenceKind.MONTHLY, null, null));
		assertEquals(LocalDate.of(2026, 10, 15), CadenceScheduleMath.advance(
			LocalDate.of(2026, 7, 15), CadenceKind.QUARTERLY, null, null));
		assertEquals(LocalDate.of(2027, 1, 15), CadenceScheduleMath.advance(
			LocalDate.of(2026, 7, 15), CadenceKind.SEMIANNUAL, null, null));
		assertEquals(LocalDate.of(2027, 7, 15), CadenceScheduleMath.advance(
			LocalDate.of(2026, 7, 15), CadenceKind.ANNUAL, null, null));
	}

	@Test
	void advanceSemimonthlyWrapsAcrossMonthBoundary() {
		assertEquals(LocalDate.of(2026, 7, 15), CadenceScheduleMath.advance(
			LocalDate.of(2026, 7, 1), CadenceKind.SEMIMONTHLY, 1, 15));
		assertEquals(LocalDate.of(2026, 8, 1), CadenceScheduleMath.advance(
			LocalDate.of(2026, 7, 15), CadenceKind.SEMIMONTHLY, 1, 15));
	}

	@Test
	void advanceSemimonthlyRequiresPaymentDays() {
		assertThrows(IllegalArgumentException.class, () -> CadenceScheduleMath.advance(
			LocalDate.of(2026, 7, 1), CadenceKind.SEMIMONTHLY, null, 15));
		assertThrows(IllegalArgumentException.class, () -> CadenceScheduleMath.advance(
			LocalDate.of(2026, 7, 1), CadenceKind.SEMIMONTHLY, 1, null));
	}

	@Test
	void firstOnOrAfterReturnsAnchorWhenAlreadyOnOrAfterTarget() {
		LocalDate anchor = LocalDate.of(2026, 8, 1);
		assertEquals(anchor, CadenceScheduleMath.firstOnOrAfter(
			anchor, LocalDate.of(2026, 7, 1), CadenceKind.MONTHLY, null, null));
	}

	@Test
	void firstOnOrAfterWalksForwardPastTarget() {
		LocalDate anchor = LocalDate.of(2026, 1, 15);
		LocalDate result = CadenceScheduleMath.firstOnOrAfter(
			anchor, LocalDate.of(2026, 7, 10), CadenceKind.MONTHLY, null, null);
		assertEquals(LocalDate.of(2026, 7, 15), result);
	}

	@Test
	void firstOnOrAfterSemimonthlyWalksForwardPastTarget() {
		LocalDate result = CadenceScheduleMath.firstOnOrAfter(
			LocalDate.of(2026, 3, 1), LocalDate.of(2026, 5, 10), CadenceKind.SEMIMONTHLY, 1, 15);
		assertEquals(LocalDate.of(2026, 5, 15), result);
	}

	@Test
	void advancerDelegatesToAdvance() {
		var advancer = CadenceScheduleMath.advancer(CadenceKind.SEMIMONTHLY, 1, 15);
		assertEquals(LocalDate.of(2026, 7, 15), advancer.apply(LocalDate.of(2026, 7, 1)));
	}
}
