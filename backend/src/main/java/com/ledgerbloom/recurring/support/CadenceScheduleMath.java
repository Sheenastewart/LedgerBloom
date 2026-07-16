package com.ledgerbloom.recurring.support;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.function.UnaryOperator;

/**
 * Calendar helpers for recurring cadences, including SEMIMONTHLY (two calendar days per month).
 * Month-end rule: if a selected day does not exist in a month, use the last calendar day of that month.
 */
public final class CadenceScheduleMath {

	static final int MAX_STEPS = 512;

	private CadenceScheduleMath() {
	}

	public static int[] sortedPaymentDays(int firstPaymentDay, int secondPaymentDay) {
		if (firstPaymentDay == secondPaymentDay) {
			throw new IllegalArgumentException("Semimonthly payment days must be different");
		}
		if (firstPaymentDay < secondPaymentDay) {
			return new int[] { firstPaymentDay, secondPaymentDay };
		}
		return new int[] { secondPaymentDay, firstPaymentDay };
	}

	/**
	 * Resolves a nominal day-of-month into a real calendar date for {@code yearMonth}.
	 * Days past the month length clamp to the last day (e.g. 31 in February → 28/29).
	 */
	public static LocalDate dateForDayInMonth(YearMonth yearMonth, int dayOfMonth) {
		Objects.requireNonNull(yearMonth, "yearMonth");
		if (dayOfMonth < 1 || dayOfMonth > 31) {
			throw new IllegalArgumentException("dayOfMonth must be between 1 and 31");
		}
		int clamped = Math.min(dayOfMonth, yearMonth.lengthOfMonth());
		return yearMonth.atDay(clamped);
	}

	public static LocalDate nextSemimonthlyAfter(LocalDate fromExclusive, int firstPaymentDay, int secondPaymentDay) {
		Objects.requireNonNull(fromExclusive, "fromExclusive");
		int[] days = sortedPaymentDays(firstPaymentDay, secondPaymentDay);
		YearMonth cursor = YearMonth.from(fromExclusive);
		for (int step = 0; step < MAX_STEPS; step++) {
			for (int day : days) {
				LocalDate candidate = dateForDayInMonth(cursor, day);
				if (candidate.isAfter(fromExclusive)) {
					return candidate;
				}
			}
			cursor = cursor.plusMonths(1);
		}
		throw new IllegalStateException("Unable to advance semimonthly schedule");
	}

	/**
	 * Advances from an occurrence date to the next one. For interval cadences, {@code from} is
	 * shifted by the interval. For SEMIMONTHLY, returns the next calendar occurrence after {@code from}.
	 */
	public static LocalDate advance(
			LocalDate from,
			CadenceKind cadence,
			Integer firstPaymentDay,
			Integer secondPaymentDay) {
		Objects.requireNonNull(from, "from");
		Objects.requireNonNull(cadence, "cadence");
		return switch (cadence) {
			case WEEKLY -> from.plusWeeks(1);
			case BIWEEKLY -> from.plusWeeks(2);
			case MONTHLY -> from.plusMonths(1);
			case QUARTERLY -> from.plusMonths(3);
			case SEMIANNUAL -> from.plusMonths(6);
			case ANNUAL -> from.plusYears(1);
			case SEMIMONTHLY -> nextSemimonthlyAfter(
				from,
				requireDay(firstPaymentDay, "firstPaymentDay"),
				requireDay(secondPaymentDay, "secondPaymentDay")
			);
		};
	}

	public static UnaryOperator<LocalDate> advancer(
			CadenceKind cadence,
			Integer firstPaymentDay,
			Integer secondPaymentDay) {
		return date -> advance(date, cadence, firstPaymentDay, secondPaymentDay);
	}

	/**
	 * Occurrences from {@code startInclusive} through {@code endInclusive}, starting at
	 * {@code startInclusive} as the first occurrence (caller should pass a valid schedule date).
	 */
	public static List<LocalDate> occurrencesThrough(
			LocalDate startInclusive,
			LocalDate endInclusive,
			CadenceKind cadence,
			Integer firstPaymentDay,
			Integer secondPaymentDay) {
		Objects.requireNonNull(startInclusive, "startInclusive");
		Objects.requireNonNull(endInclusive, "endInclusive");
		if (endInclusive.isBefore(startInclusive)) {
			return List.of();
		}
		UnaryOperator<LocalDate> advance = advancer(cadence, firstPaymentDay, secondPaymentDay);
		List<LocalDate> dates = new ArrayList<>();
		LocalDate cursor = startInclusive;
		int steps = 0;
		while (!cursor.isAfter(endInclusive) && steps < MAX_STEPS) {
			dates.add(cursor);
			LocalDate next = advance.apply(cursor);
			if (next == null || !next.isAfter(cursor)) {
				throw new IllegalStateException("Cadence advance must move strictly forward");
			}
			cursor = next;
			steps++;
		}
		return List.copyOf(dates);
	}

	/**
	 * First occurrence on or after {@code onOrAfter}, walking forward from {@code scheduleAnchor}
	 * (the original schedule start / current next date).
	 */
	public static LocalDate firstOnOrAfter(
			LocalDate scheduleAnchor,
			LocalDate onOrAfter,
			CadenceKind cadence,
			Integer firstPaymentDay,
			Integer secondPaymentDay) {
		Objects.requireNonNull(scheduleAnchor, "scheduleAnchor");
		Objects.requireNonNull(onOrAfter, "onOrAfter");
		if (!scheduleAnchor.isBefore(onOrAfter)) {
			return scheduleAnchor;
		}
		UnaryOperator<LocalDate> advance = advancer(cadence, firstPaymentDay, secondPaymentDay);
		LocalDate cursor = scheduleAnchor;
		int steps = 0;
		while (cursor.isBefore(onOrAfter) && steps < MAX_STEPS) {
			LocalDate next = advance.apply(cursor);
			if (next == null || !next.isAfter(cursor)) {
				throw new IllegalStateException("Cadence advance must move strictly forward");
			}
			cursor = next;
			steps++;
		}
		return cursor;
	}

	private static int requireDay(Integer day, String name) {
		if (day == null) {
			throw new IllegalArgumentException(name + " is required for SEMIMONTHLY");
		}
		if (day < 1 || day > 31) {
			throw new IllegalArgumentException(name + " must be between 1 and 31");
		}
		return day;
	}
}
