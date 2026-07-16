package com.ledgerbloom.recurring.support;

import com.ledgerbloom.recurring.RecurringExpense;
import com.ledgerbloom.recurringincome.RecurringIncome;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.function.UnaryOperator;

/**
 * Applies {@link RecurringOccurrenceProjector} to recurring income and expense schedules,
 * advancing via {@link CadenceScheduleMath} so SEMIMONTHLY schedules use their configured
 * payment days instead of a fixed interval.
 */
public final class RecurringPeriodProjection {

	private RecurringPeriodProjection() {
	}

	public static List<LocalDate> incomeDatesInPeriod(
			RecurringIncome schedule,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive) {
		return RecurringOccurrenceProjector.datesInPeriod(
			schedule.getNextIncomeDate(),
			periodStartInclusive,
			periodEndInclusive,
			incomeAdvancer(schedule)
		);
	}

	public static List<LocalDate> expenseDatesInPeriod(
			RecurringExpense schedule,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive) {
		return RecurringOccurrenceProjector.datesInPeriod(
			schedule.getNextPaymentDate(),
			periodStartInclusive,
			periodEndInclusive,
			expenseAdvancer(schedule)
		);
	}

	public static BigDecimal incomeAmountInPeriod(
			RecurringIncome schedule,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive) {
		return incomeAmountInPeriod(schedule, periodStartInclusive, periodEndInclusive, Set.of());
	}

	/**
	 * Same as the 3-arg overload, but excludes any occurrence date already present in
	 * {@code excludedDates} (e.g. dates already recorded via catch-up or mark-received)
	 * from both the count and the amount.
	 */
	public static BigDecimal incomeAmountInPeriod(
			RecurringIncome schedule,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive,
			Set<LocalDate> excludedDates) {
		long count = incomeDatesInPeriod(schedule, periodStartInclusive, periodEndInclusive).stream()
			.filter(date -> !excludedDates.contains(date))
			.count();
		return schedule.getAmount()
			.multiply(BigDecimal.valueOf(count))
			.setScale(2, RoundingMode.HALF_UP);
	}

	public static int incomeOccurrenceCount(
			RecurringIncome schedule,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive) {
		return incomeDatesInPeriod(schedule, periodStartInclusive, periodEndInclusive).size();
	}

	public static BigDecimal expenseAmountInPeriod(
			RecurringExpense schedule,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive) {
		return expenseAmountInPeriod(schedule, periodStartInclusive, periodEndInclusive, Set.of());
	}

	/**
	 * Same as the 3-arg overload, but excludes any occurrence date already present in
	 * {@code excludedDates} (e.g. dates already recorded via catch-up or mark-paid)
	 * from both the count and the amount.
	 */
	public static BigDecimal expenseAmountInPeriod(
			RecurringExpense schedule,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive,
			Set<LocalDate> excludedDates) {
		long count = expenseDatesInPeriod(schedule, periodStartInclusive, periodEndInclusive).stream()
			.filter(date -> !excludedDates.contains(date))
			.count();
		return schedule.getAmount()
			.multiply(BigDecimal.valueOf(count))
			.setScale(2, RoundingMode.HALF_UP);
	}

	public static int expenseOccurrenceCount(
			RecurringExpense schedule,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive) {
		return expenseDatesInPeriod(schedule, periodStartInclusive, periodEndInclusive).size();
	}

	public static BigDecimal sumIncomeInPeriod(
			List<RecurringIncome> schedules,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive) {
		BigDecimal total = BigDecimal.ZERO;
		for (RecurringIncome schedule : schedules) {
			total = total.add(incomeAmountInPeriod(schedule, periodStartInclusive, periodEndInclusive));
		}
		return total;
	}

	public static BigDecimal sumExpenseInPeriod(
			List<RecurringExpense> schedules,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive) {
		BigDecimal total = BigDecimal.ZERO;
		for (RecurringExpense schedule : schedules) {
			total = total.add(expenseAmountInPeriod(schedule, periodStartInclusive, periodEndInclusive));
		}
		return total;
	}

	private static UnaryOperator<LocalDate> incomeAdvancer(RecurringIncome schedule) {
		return CadenceScheduleMath.advancer(
			CadenceKind.fromIncome(schedule.getCadence()),
			schedule.getFirstPaymentDay(),
			schedule.getSecondPaymentDay()
		);
	}

	private static UnaryOperator<LocalDate> expenseAdvancer(RecurringExpense schedule) {
		return CadenceScheduleMath.advancer(
			CadenceKind.fromExpense(schedule.getCadence()),
			schedule.getFirstPaymentDay(),
			schedule.getSecondPaymentDay()
		);
	}
}
