package com.ledgerbloom.recurring.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.ledgerbloom.recurring.RecurringExpense;
import com.ledgerbloom.recurring.RecurringExpenseCadence;
import com.ledgerbloom.recurringincome.RecurringIncome;
import com.ledgerbloom.recurringincome.RecurringIncomeCadence;
import com.ledgerbloom.user.User;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class RecurringPeriodProjectionTest {

	private final User user = new User("proj@example.com", "hash", "Proj");

	@Test
	void monthlyIncomeCountsOnceAndDoesNotMutateSchedule() {
		RecurringIncome schedule = new RecurringIncome(
			user,
			"Salary",
			"Employer",
			new BigDecimal("3000.00"),
			RecurringIncomeCadence.MONTHLY,
			LocalDate.of(2026, 7, 15),
			true,
			null
		);
		LocalDate originalNext = schedule.getNextIncomeDate();

		assertThat(RecurringPeriodProjection.incomeOccurrenceCount(
			schedule,
			LocalDate.of(2026, 7, 1),
			LocalDate.of(2026, 7, 31)
		)).isEqualTo(1);
		assertThat(RecurringPeriodProjection.incomeAmountInPeriod(
			schedule,
			LocalDate.of(2026, 7, 1),
			LocalDate.of(2026, 7, 31)
		)).isEqualByComparingTo("3000.00");
		assertThat(schedule.getNextIncomeDate()).isEqualTo(originalNext);
	}

	@Test
	void inactiveFlagIsNotProjectedByCallersThatFilterActiveOnly() {
		// Projector itself is cadence-only; inactive schedules must be excluded before projection.
		RecurringIncome inactive = new RecurringIncome(
			user,
			"Old side gig",
			"Client",
			new BigDecimal("200.00"),
			RecurringIncomeCadence.WEEKLY,
			LocalDate.of(2026, 7, 1),
			false,
			null
		);
		assertThat(inactive.isActive()).isFalse();
		assertThat(RecurringPeriodProjection.incomeOccurrenceCount(
			inactive,
			LocalDate.of(2026, 7, 1),
			LocalDate.of(2026, 7, 31)
		)).isEqualTo(5);
	}

	@Test
	void biweeklyExpenseCountsTwoOrThreeInJuly() {
		RecurringExpense three = expense(LocalDate.of(2026, 7, 1));
		RecurringExpense two = expense(LocalDate.of(2026, 7, 8));

		assertThat(RecurringPeriodProjection.expenseOccurrenceCount(
			three,
			LocalDate.of(2026, 7, 1),
			LocalDate.of(2026, 7, 31)
		)).isEqualTo(3);
		assertThat(RecurringPeriodProjection.expenseOccurrenceCount(
			two,
			LocalDate.of(2026, 7, 1),
			LocalDate.of(2026, 7, 31)
		)).isEqualTo(2);
	}

	private RecurringExpense expense(LocalDate next) {
		return new RecurringExpense(
			user,
			"Utility",
			null,
			new BigDecimal("40.00"),
			null,
			RecurringExpenseCadence.BIWEEKLY,
			next,
			true,
			null
		);
	}
}
