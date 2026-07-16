package com.ledgerbloom.recurring.support;

import com.ledgerbloom.recurring.RecurringExpense;
import com.ledgerbloom.recurring.RecurringExpenseService;
import com.ledgerbloom.recurringincome.RecurringIncome;
import com.ledgerbloom.recurringincome.RecurringIncomeService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Applies {@link RecurringOccurrenceProjector} to recurring income and expense schedules.
 */
public final class RecurringPeriodProjection {

	private RecurringPeriodProjection() {
	}

	public static BigDecimal incomeAmountInPeriod(
			RecurringIncome schedule,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive) {
		return RecurringOccurrenceProjector.amountInPeriod(
			schedule.getNextIncomeDate(),
			schedule.getAmount(),
			periodStartInclusive,
			periodEndInclusive,
			date -> RecurringIncomeService.advanceNextIncomeDate(date, schedule.getCadence())
		);
	}

	public static int incomeOccurrenceCount(
			RecurringIncome schedule,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive) {
		return RecurringOccurrenceProjector.countInPeriod(
			schedule.getNextIncomeDate(),
			periodStartInclusive,
			periodEndInclusive,
			date -> RecurringIncomeService.advanceNextIncomeDate(date, schedule.getCadence())
		);
	}

	public static BigDecimal expenseAmountInPeriod(
			RecurringExpense schedule,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive) {
		return RecurringOccurrenceProjector.amountInPeriod(
			schedule.getNextPaymentDate(),
			schedule.getAmount(),
			periodStartInclusive,
			periodEndInclusive,
			date -> RecurringExpenseService.advanceNextPaymentDate(date, schedule.getCadence())
		);
	}

	public static int expenseOccurrenceCount(
			RecurringExpense schedule,
			LocalDate periodStartInclusive,
			LocalDate periodEndInclusive) {
		return RecurringOccurrenceProjector.countInPeriod(
			schedule.getNextPaymentDate(),
			periodStartInclusive,
			periodEndInclusive,
			date -> RecurringExpenseService.advanceNextPaymentDate(date, schedule.getCadence())
		);
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
}
