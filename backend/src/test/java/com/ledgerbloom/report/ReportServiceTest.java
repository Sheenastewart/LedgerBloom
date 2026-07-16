package com.ledgerbloom.report;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.budget.MonthlyBudgetResponse;
import com.ledgerbloom.budget.MonthlyBudgetService;
import com.ledgerbloom.category.Category;
import com.ledgerbloom.expense.Expense;
import com.ledgerbloom.expense.ExpenseRepository;
import com.ledgerbloom.income.IncomeEntry;
import com.ledgerbloom.income.IncomeEntryRepository;
import com.ledgerbloom.recurring.RecurringExpense;
import com.ledgerbloom.recurring.RecurringExpenseCadence;
import com.ledgerbloom.recurring.RecurringExpenseRepository;
import com.ledgerbloom.recurringincome.RecurringIncome;
import com.ledgerbloom.recurringincome.RecurringIncomeCadence;
import com.ledgerbloom.recurringincome.RecurringIncomeRepository;
import com.ledgerbloom.user.User;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

	private static final Long USER_ID = 1L;

	@Mock
	private ExpenseRepository expenseRepository;

	@Mock
	private IncomeEntryRepository incomeEntryRepository;

	@Mock
	private MonthlyBudgetService monthlyBudgetService;

	@Mock
	private RecurringExpenseRepository recurringExpenseRepository;

	@Mock
	private RecurringIncomeRepository recurringIncomeRepository;

	@Mock
	private CurrentUser currentUser;

	@InjectMocks
	private ReportService reportService;

	private User user;
	private Category groceries;
	private Category utilities;

	@BeforeEach
	void setUp() throws Exception {
		user = new User("user@example.com", "hash", "Test User");
		setId(user, USER_ID);
		lenient().when(currentUser.requireUserId()).thenReturn(USER_ID);

		groceries = new Category(user, "Groceries", null);
		setId(groceries, 1L);
		utilities = new Category(user, "Utilities", null);
		setId(utilities, 2L);
	}

	// ---------- getMonthlyComparison validation ----------

	@Test
	void rejectsMissingStartOrEndPeriod() {
		assertThatThrownBy(() -> reportService.getMonthlyComparison(null, 1, 2026, 1))
			.isInstanceOf(InvalidReportPeriodException.class);
		assertThatThrownBy(() -> reportService.getMonthlyComparison(2026, null, 2026, 1))
			.isInstanceOf(InvalidReportPeriodException.class);
		assertThatThrownBy(() -> reportService.getMonthlyComparison(2026, 1, null, 1))
			.isInstanceOf(InvalidReportPeriodException.class);
		assertThatThrownBy(() -> reportService.getMonthlyComparison(2026, 1, 2026, null))
			.isInstanceOf(InvalidReportPeriodException.class);
	}

	@Test
	void rejectsInvalidMonthValues() {
		assertThatThrownBy(() -> reportService.getMonthlyComparison(2026, 0, 2026, 1))
			.isInstanceOf(InvalidReportPeriodException.class)
			.hasMessage("month must be between 1 and 12");
		assertThatThrownBy(() -> reportService.getMonthlyComparison(2026, 1, 2026, 13))
			.isInstanceOf(InvalidReportPeriodException.class)
			.hasMessage("month must be between 1 and 12");
	}

	@Test
	void rejectsInvalidYearValues() {
		assertThatThrownBy(() -> reportService.getMonthlyComparison(0, 1, 2026, 1))
			.isInstanceOf(InvalidReportPeriodException.class)
			.hasMessage("year must be a positive value between 1 and 9999");
		assertThatThrownBy(() -> reportService.getMonthlyComparison(2026, 1, 10000, 1))
			.isInstanceOf(InvalidReportPeriodException.class)
			.hasMessage("year must be a positive value between 1 and 9999");
	}

	@Test
	void rejectsStartAfterEnd() {
		assertThatThrownBy(() -> reportService.getMonthlyComparison(2026, 7, 2026, 1))
			.isInstanceOf(InvalidReportPeriodException.class)
			.hasMessage("Start period must not be after end period");
	}

	@Test
	void rejectsRangeLargerThan24Months() {
		assertThatThrownBy(() -> reportService.getMonthlyComparison(2024, 1, 2026, 2))
			.isInstanceOf(ReportRangeTooLargeException.class)
			.hasMessageContaining("24");
	}

	@Test
	void allowsExactly24Months() {
		for (int month = 1; month <= 12; month++) {
			stubEmptyMonth(2024, month);
			stubEmptyMonth(2025, month);
		}

		MonthlyComparisonResponse response = reportService.getMonthlyComparison(2024, 1, 2025, 12);

		assertThat(response.monthCount()).isEqualTo(24);
		assertThat(response.months()).hasSize(24);
	}

	// ---------- getMonthlyComparison aggregation ----------

	@Test
	void emptyRangeReturnsZeroedItems() {
		stubEmptyMonth(2026, 1);
		stubEmptyMonth(2026, 2);

		MonthlyComparisonResponse response = reportService.getMonthlyComparison(2026, 1, 2026, 2);

		assertThat(response.months()).hasSize(2);
		for (MonthlyComparisonItem item : response.months()) {
			assertThat(item.totalIncome()).isEqualByComparingTo("0.00");
			assertThat(item.totalExpenses()).isEqualByComparingTo("0.00");
			assertThat(item.netCashFlow()).isEqualByComparingTo("0.00");
			assertThat(item.incomeCount()).isZero();
			assertThat(item.expenseCount()).isZero();
			assertThat(item.budgetLimit()).isNull();
			assertThat(item.remainingBudget()).isNull();
			assertThat(item.budgetPercentUsed()).isNull();
			assertThat(item.overBudget()).isNull();
		}
	}

	@Test
	void aggregatesTotalsNetAndCountsPerMonth() throws Exception {
		stubMonth(
			2026,
			1,
			List.of(income(1L, "Pay", "Salary", "1000.00", LocalDate.of(2026, 1, 1))),
			List.of(expense(2L, "Rent", "400.00", LocalDate.of(2026, 1, 2), groceries))
		);
		stubMonth(
			2026,
			2,
			List.of(income(3L, "Pay", "Salary", "500.00", LocalDate.of(2026, 2, 1))),
			List.of(expense(4L, "Repair", "700.00", LocalDate.of(2026, 2, 2), utilities))
		);

		MonthlyComparisonResponse response = reportService.getMonthlyComparison(2026, 1, 2026, 2);

		MonthlyComparisonItem jan = response.months().get(0);
		assertThat(jan.year()).isEqualTo(2026);
		assertThat(jan.month()).isEqualTo(1);
		assertThat(jan.totalIncome()).isEqualByComparingTo("1000.00");
		assertThat(jan.totalExpenses()).isEqualByComparingTo("400.00");
		assertThat(jan.netCashFlow()).isEqualByComparingTo("600.00");
		assertThat(jan.incomeCount()).isEqualTo(1);
		assertThat(jan.expenseCount()).isEqualTo(1);

		MonthlyComparisonItem feb = response.months().get(1);
		assertThat(feb.totalIncome()).isEqualByComparingTo("500.00");
		assertThat(feb.totalExpenses()).isEqualByComparingTo("700.00");
		assertThat(feb.netCashFlow()).isEqualByComparingTo("-200.00");
	}

	@Test
	void includesBudgetSummaryWhenPresentAndNullWhenAbsent() {
		LocalDate start = YearMonth.of(2026, 1).atDay(1);
		LocalDate endExclusive = start.plusMonths(1);
		when(incomeEntryRepository
			.findByUser_IdAndIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
				USER_ID,
				start,
				endExclusive
			)).thenReturn(List.of());
		when(expenseRepository
			.findByUser_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
				USER_ID,
				start,
				endExclusive
			)).thenReturn(List.of());
		when(recurringIncomeRepository.findActiveInMonth(USER_ID, start, YearMonth.of(2026, 1).atEndOfMonth()))
			.thenReturn(List.of());
		when(recurringExpenseRepository.findActiveInMonth(USER_ID, start, YearMonth.of(2026, 1).atEndOfMonth()))
			.thenReturn(List.of());
		when(monthlyBudgetService.findOptionalByYearAndMonth(2026, 1)).thenReturn(Optional.of(
			new MonthlyBudgetResponse(
				10L,
				2026,
				1,
				new BigDecimal("500.00"),
				new BigDecimal("600.00"),
				new BigDecimal("-100.00"),
				new BigDecimal("120.00"),
				true,
				3,
				List.of(),
				Instant.now(),
				Instant.now()
			)
		));
		stubEmptyMonth(2026, 2);

		MonthlyComparisonResponse response = reportService.getMonthlyComparison(2026, 1, 2026, 2);

		MonthlyComparisonItem jan = response.months().get(0);
		assertThat(jan.budgetLimit()).isEqualByComparingTo("500.00");
		assertThat(jan.remainingBudget()).isEqualByComparingTo("-100.00");
		assertThat(jan.budgetPercentUsed()).isEqualByComparingTo("120.00");
		assertThat(jan.overBudget()).isTrue();

		MonthlyComparisonItem feb = response.months().get(1);
		assertThat(feb.budgetLimit()).isNull();
		assertThat(feb.overBudget()).isNull();
	}

	@Test
	void computesRecurringProjections() throws Exception {
		LocalDate monthStart = LocalDate.of(2026, 7, 1);
		LocalDate monthEnd = LocalDate.of(2026, 7, 31);
		stubMonth(
			2026,
			7,
			List.of(income(1L, "Pay", "Salary", "2000.00", LocalDate.of(2026, 7, 1))),
			List.of(expense(2L, "Groceries", "500.00", LocalDate.of(2026, 7, 2), groceries))
		);

		RecurringIncome scheduledIncome = new RecurringIncome(
			user,
			"Bonus",
			"Employer",
			new BigDecimal("300.00"),
			RecurringIncomeCadence.MONTHLY,
			LocalDate.of(2026, 7, 20),
			true,
			null
		);
		setId(scheduledIncome, 50L);
		RecurringExpense scheduledExpense = new RecurringExpense(
			user,
			"Netflix",
			null,
			new BigDecimal("15.99"),
			utilities,
			RecurringExpenseCadence.MONTHLY,
			LocalDate.of(2026, 7, 10),
			true,
			null
		);
		setId(scheduledExpense, 60L);

		when(recurringIncomeRepository.findActiveInMonth(USER_ID, monthStart, monthEnd))
			.thenReturn(List.of(scheduledIncome));
		when(recurringExpenseRepository.findActiveInMonth(USER_ID, monthStart, monthEnd))
			.thenReturn(List.of(scheduledExpense));

		MonthlyComparisonResponse response = reportService.getMonthlyComparison(2026, 7, 2026, 7);

		MonthlyComparisonItem item = response.months().get(0);
		assertThat(item.expectedRecurringIncome()).isEqualByComparingTo("300.00");
		assertThat(item.expectedRecurringExpenses()).isEqualByComparingTo("15.99");
		// 2000 + 300 - 500 - 15.99 = 1784.01
		assertThat(item.projectedCashFlow()).isEqualByComparingTo("1784.01");
	}

	// ---------- getYearToDate validation ----------

	@Test
	void rejectsNullYear() {
		assertThatThrownBy(() -> reportService.getYearToDate(null))
			.isInstanceOf(InvalidReportPeriodException.class);
	}

	@Test
	void rejectsYearOutOfBounds() {
		assertThatThrownBy(() -> reportService.getYearToDate(0))
			.isInstanceOf(InvalidReportPeriodException.class)
			.hasMessage("year must be a positive value between 1 and 9999");
	}

	@Test
	void rejectsFutureYear() {
		int futureYear = LocalDate.now().getYear() + 1;

		assertThatThrownBy(() -> reportService.getYearToDate(futureYear))
			.isInstanceOf(InvalidReportPeriodException.class)
			.hasMessage("Cannot report on a future year");
	}

	@Test
	void pastYearAggregatesFullTwelveMonths() throws Exception {
		int pastYear = LocalDate.now().getYear() - 1;

		for (int month = 1; month <= 12; month++) {
			stubEmptyMonth(pastYear, month);
		}
		// January: strong income month
		overrideMonth(
			pastYear,
			1,
			List.of(income(1L, "Pay", "Salary", "5000.00", LocalDate.of(pastYear, 1, 5))),
			List.of(expense(2L, "Rent", "1000.00", LocalDate.of(pastYear, 1, 6), groceries))
		);
		// March: highest expenses, worst net cash flow
		overrideMonth(
			pastYear,
			3,
			List.of(income(3L, "Pay", "Salary", "1000.00", LocalDate.of(pastYear, 3, 5))),
			List.of(expense(4L, "Repair", "4000.00", LocalDate.of(pastYear, 3, 6), utilities))
		);
		// A budget in January that is over budget
		when(monthlyBudgetService.findOptionalByYearAndMonth(pastYear, 1)).thenReturn(Optional.of(
			new MonthlyBudgetResponse(
				20L,
				pastYear,
				1,
				new BigDecimal("500.00"),
				new BigDecimal("1000.00"),
				new BigDecimal("-500.00"),
				new BigDecimal("200.00"),
				true,
				1,
				List.of(),
				Instant.now(),
				Instant.now()
			)
		));
		when(monthlyBudgetService.findOptionalByYearAndMonth(pastYear, 3)).thenReturn(Optional.of(
			new MonthlyBudgetResponse(
				21L,
				pastYear,
				3,
				new BigDecimal("2000.00"),
				new BigDecimal("4000.00"),
				new BigDecimal("-2000.00"),
				new BigDecimal("200.00"),
				true,
				1,
				List.of(),
				Instant.now(),
				Instant.now()
			)
		));

		LocalDate yearStart = LocalDate.of(pastYear, 1, 1);
		LocalDate yearEndExclusive = LocalDate.of(pastYear + 1, 1, 1);
		when(expenseRepository
			.findByUser_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
				USER_ID,
				yearStart,
				yearEndExclusive
			)).thenReturn(List.of(
			expense(2L, "Rent", "1000.00", LocalDate.of(pastYear, 1, 6), groceries),
			expense(4L, "Repair", "4000.00", LocalDate.of(pastYear, 3, 6), utilities)
		));
		when(incomeEntryRepository
			.findByUser_IdAndIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
				USER_ID,
				yearStart,
				yearEndExclusive
			)).thenReturn(List.of(
			income(1L, "Pay", "Salary", "5000.00", LocalDate.of(pastYear, 1, 5)),
			income(3L, "Pay", "Salary", "1000.00", LocalDate.of(pastYear, 3, 5))
		));

		YearToDateResponse response = reportService.getYearToDate(pastYear);

		assertThat(response.year()).isEqualTo(pastYear);
		assertThat(response.monthSummaries()).hasSize(12);
		assertThat(response.totals().totalIncome()).isEqualByComparingTo("6000.00");
		assertThat(response.totals().totalExpenses()).isEqualByComparingTo("5000.00");
		assertThat(response.totals().netCashFlow()).isEqualByComparingTo("1000.00");
		assertThat(response.averages().averageIncome()).isEqualByComparingTo("500.00");
		assertThat(response.averages().averageExpenses()).isEqualByComparingTo("416.67");

		assertThat(response.highestIncomeMonth()).isNotNull();
		assertThat(response.highestIncomeMonth().month()).isEqualTo(1);
		assertThat(response.highestIncomeMonth().value()).isEqualByComparingTo("5000.00");

		assertThat(response.highestExpenseMonth().month()).isEqualTo(3);
		assertThat(response.highestExpenseMonth().value()).isEqualByComparingTo("4000.00");

		assertThat(response.bestNetCashFlowMonth().month()).isEqualTo(1);
		assertThat(response.worstNetCashFlowMonth().month()).isEqualTo(3);

		assertThat(response.totalBudgeted()).isEqualByComparingTo("2500.00");
		assertThat(response.totalBudgetRemaining()).isEqualByComparingTo("-2500.00");
		assertThat(response.monthsOverBudget()).isEqualTo(2);

		assertThat(response.spendingByCategory()).hasSize(2);
		assertThat(response.spendingByCategory().get(0).categoryName()).isEqualTo("Utilities");
		assertThat(response.spendingByCategory().get(0).total()).isEqualByComparingTo("4000.00");

		assertThat(response.incomeBySource()).hasSize(1);
		assertThat(response.incomeBySource().get(0).source()).isEqualTo("Salary");
		assertThat(response.incomeBySource().get(0).total()).isEqualByComparingTo("6000.00");
	}

	@Test
	void currentYearCapsMonthSummariesAtCurrentMonth() {
		LocalDate today = LocalDate.now();
		int currentYear = today.getYear();
		int currentMonth = today.getMonthValue();

		for (int month = 1; month <= currentMonth; month++) {
			stubEmptyMonth(currentYear, month);
		}

		LocalDate yearStart = LocalDate.of(currentYear, 1, 1);
		LocalDate endExclusive = YearMonth.of(currentYear, currentMonth).atDay(1).plusMonths(1);
		when(expenseRepository
			.findByUser_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
				USER_ID,
				yearStart,
				endExclusive
			)).thenReturn(List.of());
		when(incomeEntryRepository
			.findByUser_IdAndIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
				USER_ID,
				yearStart,
				endExclusive
			)).thenReturn(List.of());

		YearToDateResponse response = reportService.getYearToDate(currentYear);

		assertThat(response.monthSummaries()).hasSize(currentMonth);
		assertThat(response.monthSummaries().get(response.monthSummaries().size() - 1).month())
			.isEqualTo(currentMonth);
	}

	// ---------- test helpers ----------

	private void stubMonth(int year, int month, List<IncomeEntry> incomeEntries, List<Expense> expenses) {
		LocalDate start = YearMonth.of(year, month).atDay(1);
		LocalDate endExclusive = start.plusMonths(1);
		LocalDate monthEnd = YearMonth.of(year, month).atEndOfMonth();
		when(incomeEntryRepository
			.findByUser_IdAndIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
				USER_ID,
				start,
				endExclusive
			)).thenReturn(incomeEntries);
		when(expenseRepository
			.findByUser_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
				USER_ID,
				start,
				endExclusive
			)).thenReturn(expenses);
		when(monthlyBudgetService.findOptionalByYearAndMonth(year, month)).thenReturn(Optional.empty());
		when(recurringIncomeRepository.findActiveInMonth(USER_ID, start, monthEnd)).thenReturn(List.of());
		when(recurringExpenseRepository.findActiveInMonth(USER_ID, start, monthEnd)).thenReturn(List.of());
	}

	private void overrideMonth(int year, int month, List<IncomeEntry> incomeEntries, List<Expense> expenses) {
		stubMonth(year, month, incomeEntries, expenses);
	}

	private void stubEmptyMonth(int year, int month) {
		stubMonth(year, month, List.of(), List.of());
	}

	private IncomeEntry income(Long id, String description, String source, String amount, LocalDate date)
			throws Exception {
		IncomeEntry entry = new IncomeEntry(user, description, source, new BigDecimal(amount), date, null);
		setId(entry, id);
		return entry;
	}

	private Expense expense(Long id, String description, String amount, LocalDate date, Category category)
			throws Exception {
		Expense expenseEntity = new Expense(user, description, null, new BigDecimal(amount), date, null, category);
		setId(expenseEntity, id);
		return expenseEntity;
	}

	private static void setId(Object entity, Long id) throws Exception {
		Field field = entity.getClass().getDeclaredField("id");
		field.setAccessible(true);
		field.set(entity, id);
	}
}
