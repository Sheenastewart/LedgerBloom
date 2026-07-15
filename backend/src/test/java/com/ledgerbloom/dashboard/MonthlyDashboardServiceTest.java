package com.ledgerbloom.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ledgerbloom.category.Category;
import com.ledgerbloom.expense.Expense;
import com.ledgerbloom.expense.ExpenseRepository;
import com.ledgerbloom.income.IncomeEntry;
import com.ledgerbloom.income.IncomeEntryRepository;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MonthlyDashboardServiceTest {

	@Mock
	private ExpenseRepository expenseRepository;

	@Mock
	private IncomeEntryRepository incomeEntryRepository;

	@InjectMocks
	private MonthlyDashboardService monthlyDashboardService;

	private Category groceries;
	private Category utilities;

	@BeforeEach
	void setUp() throws Exception {
		groceries = new Category("Groceries", null);
		setId(groceries, 1L);
		utilities = new Category("Utilities", null);
		setId(utilities, 2L);
	}

	@Test
	void aggregatesMonthTotalsNetAndCounts() throws Exception {
		stubMonth(
			2026,
			7,
			List.of(
				income(10L, "Paycheck", "Salary", "3000.00", LocalDate.of(2026, 7, 1)),
				income(11L, "Gig", "Freelance", "250.50", LocalDate.of(2026, 7, 15))
			),
			List.of(
				expense(20L, "Food", "80.00", LocalDate.of(2026, 7, 2), groceries),
				expense(21L, "Power", "120.25", LocalDate.of(2026, 7, 5), utilities)
			)
		);

		MonthlyDashboardResponse response = monthlyDashboardService.getMonthlyDashboard(2026, 7);

		assertThat(response.year()).isEqualTo(2026);
		assertThat(response.month()).isEqualTo(7);
		assertThat(response.totalIncome()).isEqualByComparingTo("3250.50");
		assertThat(response.totalExpenses()).isEqualByComparingTo("200.25");
		assertThat(response.netCashFlow()).isEqualByComparingTo("3050.25");
		assertThat(response.incomeEntryCount()).isEqualTo(2);
		assertThat(response.expenseEntryCount()).isEqualTo(2);
		verify(incomeEntryRepository).findByIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
			LocalDate.of(2026, 7, 1),
			LocalDate.of(2026, 8, 1)
		);
		verify(expenseRepository).findByExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
			LocalDate.of(2026, 7, 1),
			LocalDate.of(2026, 8, 1)
		);
	}

	@Test
	void returnsNegativeNetWhenExpensesExceedIncome() throws Exception {
		stubMonth(
			2026,
			6,
			List.of(income(1L, "Odd job", "Cash", "50.00", LocalDate.of(2026, 6, 1))),
			List.of(expense(2L, "Repair", "200.00", LocalDate.of(2026, 6, 2), groceries))
		);

		MonthlyDashboardResponse response = monthlyDashboardService.getMonthlyDashboard(2026, 6);

		assertThat(response.netCashFlow()).isEqualByComparingTo("-150.00");
	}

	@Test
	void emptyMonthReturnsZeroTotalsAndNullLargest() {
		stubMonth(2026, 1, List.of(), List.of());

		MonthlyDashboardResponse response = monthlyDashboardService.getMonthlyDashboard(2026, 1);

		assertThat(response.totalIncome()).isEqualByComparingTo("0.00");
		assertThat(response.totalExpenses()).isEqualByComparingTo("0.00");
		assertThat(response.netCashFlow()).isEqualByComparingTo("0.00");
		assertThat(response.incomeEntryCount()).isZero();
		assertThat(response.expenseEntryCount()).isZero();
		assertThat(response.spendingByCategory()).isEmpty();
		assertThat(response.incomeBySource()).isEmpty();
		assertThat(response.largestExpense()).isNull();
		assertThat(response.largestIncome()).isNull();
	}

	@Test
	void spendingByCategorySortedByTotalDescending() throws Exception {
		stubMonth(
			2026,
			7,
			List.of(),
			List.of(
				expense(1L, "Milk", "10.00", LocalDate.of(2026, 7, 1), groceries),
				expense(2L, "Eggs", "15.00", LocalDate.of(2026, 7, 2), groceries),
				expense(3L, "Power", "100.00", LocalDate.of(2026, 7, 3), utilities)
			)
		);

		MonthlyDashboardResponse response = monthlyDashboardService.getMonthlyDashboard(2026, 7);

		assertThat(response.spendingByCategory()).hasSize(2);
		assertThat(response.spendingByCategory().get(0).categoryName()).isEqualTo("Utilities");
		assertThat(response.spendingByCategory().get(0).total()).isEqualByComparingTo("100.00");
		assertThat(response.spendingByCategory().get(0).entryCount()).isEqualTo(1);
		assertThat(response.spendingByCategory().get(1).categoryName()).isEqualTo("Groceries");
		assertThat(response.spendingByCategory().get(1).total()).isEqualByComparingTo("25.00");
		assertThat(response.spendingByCategory().get(1).entryCount()).isEqualTo(2);
	}

	@Test
	void incomeBySourceGroupsCaseInsensitively() throws Exception {
		stubMonth(
			2026,
			7,
			List.of(
				income(1L, "Pay A", "Salary", "1000.00", LocalDate.of(2026, 7, 1)),
				income(2L, "Pay B", "salary", "500.00", LocalDate.of(2026, 7, 15)),
				income(3L, "Gig", "Freelance", "200.00", LocalDate.of(2026, 7, 20))
			),
			List.of()
		);

		MonthlyDashboardResponse response = monthlyDashboardService.getMonthlyDashboard(2026, 7);

		assertThat(response.incomeBySource()).hasSize(2);
		assertThat(response.incomeBySource().get(0).source()).isEqualTo("Salary");
		assertThat(response.incomeBySource().get(0).total()).isEqualByComparingTo("1500.00");
		assertThat(response.incomeBySource().get(0).entryCount()).isEqualTo(2);
		assertThat(response.incomeBySource().get(1).source()).isEqualTo("Freelance");
		assertThat(response.incomeBySource().get(1).total()).isEqualByComparingTo("200.00");
	}

	@Test
	void findsLargestExpenseAndIncome() throws Exception {
		stubMonth(
			2026,
			7,
			List.of(
				income(1L, "Small", "A", "100.00", LocalDate.of(2026, 7, 1)),
				income(2L, "Large", "B", "900.00", LocalDate.of(2026, 7, 2))
			),
			List.of(
				expense(3L, "Small spend", "40.00", LocalDate.of(2026, 7, 3), groceries),
				expense(4L, "Big spend", "400.00", LocalDate.of(2026, 7, 4), utilities)
			)
		);

		MonthlyDashboardResponse response = monthlyDashboardService.getMonthlyDashboard(2026, 7);

		assertThat(response.largestIncome().id()).isEqualTo(2L);
		assertThat(response.largestIncome().description()).isEqualTo("Large");
		assertThat(response.largestIncome().amount()).isEqualByComparingTo("900.00");
		assertThat(response.largestIncome().source()).isEqualTo("B");
		assertThat(response.largestExpense().id()).isEqualTo(4L);
		assertThat(response.largestExpense().description()).isEqualTo("Big spend");
		assertThat(response.largestExpense().amount()).isEqualByComparingTo("400.00");
		assertThat(response.largestExpense().categoryName()).isEqualTo("Utilities");
	}

	@Test
	void largestTieBreaksByHigherId() throws Exception {
		stubMonth(
			2026,
			7,
			List.of(
				income(1L, "First", "A", "100.00", LocalDate.of(2026, 7, 1)),
				income(5L, "Second", "A", "100.00", LocalDate.of(2026, 7, 2))
			),
			List.of(
				expense(2L, "First spend", "50.00", LocalDate.of(2026, 7, 1), groceries),
				expense(8L, "Second spend", "50.00", LocalDate.of(2026, 7, 2), groceries)
			)
		);

		MonthlyDashboardResponse response = monthlyDashboardService.getMonthlyDashboard(2026, 7);

		assertThat(response.largestIncome().id()).isEqualTo(5L);
		assertThat(response.largestExpense().id()).isEqualTo(8L);
	}

	@Test
	void rejectsMissingYearOrMonth() {
		assertThatThrownBy(() -> monthlyDashboardService.getMonthlyDashboard(null, 7))
			.isInstanceOf(InvalidDashboardFilterException.class)
			.hasMessage("year and month must both be provided");

		assertThatThrownBy(() -> monthlyDashboardService.getMonthlyDashboard(2026, null))
			.isInstanceOf(InvalidDashboardFilterException.class)
			.hasMessage("year and month must both be provided");
	}

	@Test
	void rejectsInvalidMonth() {
		assertThatThrownBy(() -> monthlyDashboardService.getMonthlyDashboard(2026, 0))
			.isInstanceOf(InvalidDashboardFilterException.class)
			.hasMessage("month must be between 1 and 12");

		assertThatThrownBy(() -> monthlyDashboardService.getMonthlyDashboard(2026, 13))
			.isInstanceOf(InvalidDashboardFilterException.class)
			.hasMessage("month must be between 1 and 12");
	}

	@Test
	void rejectsInvalidYear() {
		assertThatThrownBy(() -> monthlyDashboardService.getMonthlyDashboard(0, 7))
			.isInstanceOf(InvalidDashboardFilterException.class)
			.hasMessage("year must be a positive value between 1 and 9999");

		assertThatThrownBy(() -> monthlyDashboardService.getMonthlyDashboard(10000, 7))
			.isInstanceOf(InvalidDashboardFilterException.class)
			.hasMessage("year must be a positive value between 1 and 9999");
	}

	private void stubMonth(int year, int month, List<IncomeEntry> incomeEntries, List<Expense> expenses) {
		LocalDate start = YearMonth.of(year, month).atDay(1);
		LocalDate endExclusive = start.plusMonths(1);
		when(incomeEntryRepository.findByIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
			start,
			endExclusive
		)).thenReturn(incomeEntries);
		when(expenseRepository.findByExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
			start,
			endExclusive
		)).thenReturn(expenses);
	}

	private IncomeEntry income(Long id, String description, String source, String amount, LocalDate date)
			throws Exception {
		IncomeEntry entry = new IncomeEntry(description, source, new BigDecimal(amount), date, null);
		setId(entry, id);
		return entry;
	}

	private Expense expense(Long id, String description, String amount, LocalDate date, Category category)
			throws Exception {
		Expense expenseEntity = new Expense(description, null, new BigDecimal(amount), date, null, category);
		setId(expenseEntity, id);
		return expenseEntity;
	}

	private static void setId(Object entity, Long id) throws Exception {
		Field field = entity.getClass().getDeclaredField("id");
		field.setAccessible(true);
		field.set(entity, id);
	}
}
