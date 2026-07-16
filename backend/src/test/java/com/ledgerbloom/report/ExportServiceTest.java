package com.ledgerbloom.report;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.category.Category;
import com.ledgerbloom.expense.Expense;
import com.ledgerbloom.expense.ExpenseRepository;
import com.ledgerbloom.income.IncomeEntry;
import com.ledgerbloom.income.IncomeEntryRepository;
import com.ledgerbloom.user.User;
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
class ExportServiceTest {

	private static final Long USER_ID = 1L;

	@Mock
	private ExpenseRepository expenseRepository;

	@Mock
	private IncomeEntryRepository incomeEntryRepository;

	@Mock
	private ReportService reportService;

	@Mock
	private CurrentUser currentUser;

	@InjectMocks
	private ExportService exportService;

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

	// ---------- validation ----------

	@Test
	void transactionsCsvRejectsMissingPeriod() {
		assertThatThrownBy(() -> exportService.generateMonthlyTransactionsCsv(null, 7))
			.isInstanceOf(InvalidReportPeriodException.class);
		assertThatThrownBy(() -> exportService.generateMonthlyTransactionsCsv(2026, null))
			.isInstanceOf(InvalidReportPeriodException.class);
	}

	@Test
	void transactionsCsvRejectsInvalidMonth() {
		assertThatThrownBy(() -> exportService.generateMonthlyTransactionsCsv(2026, 13))
			.isInstanceOf(InvalidReportPeriodException.class)
			.hasMessage("month must be between 1 and 12");
	}

	@Test
	void transactionsCsvRejectsInvalidYear() {
		assertThatThrownBy(() -> exportService.generateMonthlyTransactionsCsv(10000, 1))
			.isInstanceOf(InvalidReportPeriodException.class)
			.hasMessage("year must be a positive value between 1 and 9999");
	}

	@Test
	void summaryCsvRejectsMissingPeriod() {
		assertThatThrownBy(() -> exportService.generateMonthlySummaryCsv(null, 7))
			.isInstanceOf(InvalidReportPeriodException.class);
	}

	// ---------- monthly transactions export ----------

	@Test
	void transactionsCsvEmptyMonthReturnsOnlyHeader() {
		stubTransactionMonth(2026, 1, List.of(), List.of());

		CsvExport export = exportService.generateMonthlyTransactionsCsv(2026, 1);

		assertThat(export.filename()).isEqualTo("ledgerbloom-transactions-2026-01.csv");
		String[] lines = export.content().split("\r\n");
		assertThat(lines).hasSize(1);
		assertThat(lines[0]).isEqualTo("Type,Date,Description,SourceOrMerchant,Category,Amount,Notes");
	}

	@Test
	void transactionsCsvIncludesIncomeAndExpenseRowsSortedByDateDescThenType() throws Exception {
		stubTransactionMonth(
			2026,
			7,
			List.of(income(1L, "Paycheck", "Salary", "3000.00", LocalDate.of(2026, 7, 15), "Biweekly")),
			List.of(expense(2L, "Power", "Utility Co", "120.25", LocalDate.of(2026, 7, 15), utilities, null))
		);

		CsvExport export = exportService.generateMonthlyTransactionsCsv(2026, 7);

		String[] lines = export.content().split("\r\n");
		assertThat(lines).hasSize(3);
		assertThat(lines[0]).isEqualTo("Type,Date,Description,SourceOrMerchant,Category,Amount,Notes");
		// Same date (2026-07-15): EXPENSE sorts before INCOME (ascending type as secondary key)
		assertThat(lines[1]).isEqualTo("EXPENSE,2026-07-15,Power,Utility Co,Utilities,120.25,");
		assertThat(lines[2]).isEqualTo("INCOME,2026-07-15,Paycheck,Salary,,3000.00,Biweekly");
	}

	@Test
	void transactionsCsvSortsNewestDateFirst() throws Exception {
		stubTransactionMonth(
			2026,
			7,
			List.of(
				income(1L, "Early pay", "Salary", "1000.00", LocalDate.of(2026, 7, 1), null),
				income(2L, "Late pay", "Salary", "500.00", LocalDate.of(2026, 7, 28), null)
			),
			List.of()
		);

		CsvExport export = exportService.generateMonthlyTransactionsCsv(2026, 7);

		String[] lines = export.content().split("\r\n");
		assertThat(lines[1]).startsWith("INCOME,2026-07-28");
		assertThat(lines[2]).startsWith("INCOME,2026-07-01");
	}

	@Test
	void transactionsCsvEscapesFormulaInjectionInDescription() throws Exception {
		stubTransactionMonth(
			2026,
			7,
			List.of(income(1L, "=SUM(A1:A9)", "Payroll, Inc", "100.00", LocalDate.of(2026, 7, 1), null)),
			List.of()
		);

		CsvExport export = exportService.generateMonthlyTransactionsCsv(2026, 7);

		String[] lines = export.content().split("\r\n");
		assertThat(lines[1]).contains("'=SUM(A1:A9)");
		assertThat(lines[1]).contains("\"Payroll, Inc\"");
	}

	@Test
	void transactionsCsvWrapsUnexpectedFailure() {
		LocalDate start = YearMonth.of(2026, 7).atDay(1);
		LocalDate endExclusive = start.plusMonths(1);
		when(incomeEntryRepository
			.findByUser_IdAndIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
				USER_ID,
				start,
				endExclusive
			)).thenThrow(new RuntimeException("db down"));

		assertThatThrownBy(() -> exportService.generateMonthlyTransactionsCsv(2026, 7))
			.isInstanceOf(ExportGenerationFailedException.class);
	}

	// ---------- monthly summary export ----------

	@Test
	void summaryCsvBuildsMultiSectionCsv() throws Exception {
		MonthlyComparisonItem item = new MonthlyComparisonItem(
			2026, 7,
			new BigDecimal("3000.00"), new BigDecimal("120.25"), new BigDecimal("2879.75"),
			1, 1,
			new BigDecimal("500.00"), new BigDecimal("379.75"), new BigDecimal("24.05"), false,
			new BigDecimal("0.00"), new BigDecimal("0.00"), new BigDecimal("2879.75")
		);
		when(reportService.getMonthlyComparison(2026, 7, 2026, 7)).thenReturn(
			new MonthlyComparisonResponse(2026, 7, 2026, 7, 1, List.of(item))
		);
		stubTransactionMonth(
			2026,
			7,
			List.of(income(1L, "Paycheck", "Salary", "3000.00", LocalDate.of(2026, 7, 1), null)),
			List.of(expense(2L, "Power", null, "120.25", LocalDate.of(2026, 7, 5), utilities, null))
		);

		CsvExport export = exportService.generateMonthlySummaryCsv(2026, 7);

		assertThat(export.filename()).isEqualTo("ledgerbloom-summary-2026-07.csv");
		String content = export.content();
		assertThat(content).contains("Monthly Summary,2026,07");
		assertThat(content).contains("Metric,Value");
		assertThat(content).contains("Total Income,3000.00");
		assertThat(content).contains("Total Expenses,120.25");
		assertThat(content).contains("Net Cash Flow,2879.75");
		assertThat(content).contains("Projected Income,3000.00");
		assertThat(content).contains("Over Budget,false");
		assertThat(content).contains("Spending By Category");
		assertThat(content).contains("Utilities,120.25,1");
		assertThat(content).contains("Income By Source");
		assertThat(content).contains("Salary,3000.00,1");
	}

	@Test
	void summaryCsvHandlesMissingBudgetAsEmptyCells() {
		MonthlyComparisonItem item = new MonthlyComparisonItem(
			2026, 1,
			new BigDecimal("0.00"), new BigDecimal("0.00"), new BigDecimal("0.00"),
			0, 0,
			null, null, null, null,
			new BigDecimal("0.00"), new BigDecimal("0.00"), new BigDecimal("0.00")
		);
		when(reportService.getMonthlyComparison(2026, 1, 2026, 1)).thenReturn(
			new MonthlyComparisonResponse(2026, 1, 2026, 1, 1, List.of(item))
		);
		stubTransactionMonth(2026, 1, List.of(), List.of());

		CsvExport export = exportService.generateMonthlySummaryCsv(2026, 1);

		String content = export.content();
		assertThat(content).contains("Budget Limit,\r\n");
		assertThat(content).contains("Over Budget,\r\n");
	}

	@Test
	void summaryCsvWrapsUnexpectedFailure() {
		when(reportService.getMonthlyComparison(2026, 7, 2026, 7))
			.thenThrow(new RuntimeException("unexpected"));

		assertThatThrownBy(() -> exportService.generateMonthlySummaryCsv(2026, 7))
			.isInstanceOf(ExportGenerationFailedException.class);
	}

	@Test
	void summaryCsvPropagatesReportRangeTooLargeAsIs() {
		when(reportService.getMonthlyComparison(2026, 7, 2026, 7))
			.thenThrow(new ReportRangeTooLargeException("too large"));

		assertThatThrownBy(() -> exportService.generateMonthlySummaryCsv(2026, 7))
			.isInstanceOf(ReportRangeTooLargeException.class);
	}

	// ---------- helpers ----------

	private void stubTransactionMonth(int year, int month, List<IncomeEntry> incomeEntries, List<Expense> expenses) {
		LocalDate start = YearMonth.of(year, month).atDay(1);
		LocalDate endExclusive = start.plusMonths(1);
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
	}

	private IncomeEntry income(Long id, String description, String source, String amount, LocalDate date, String notes)
			throws Exception {
		IncomeEntry entry = new IncomeEntry(user, description, source, new BigDecimal(amount), date, notes);
		setId(entry, id);
		return entry;
	}

	private Expense expense(
			Long id,
			String description,
			String merchant,
			String amount,
			LocalDate date,
			Category category,
			String notes) throws Exception {
		Expense expenseEntity = new Expense(user, description, merchant, new BigDecimal(amount), date, notes, category);
		setId(expenseEntity, id);
		return expenseEntity;
	}

	private static void setId(Object entity, Long id) throws Exception {
		Field field = entity.getClass().getDeclaredField("id");
		field.setAccessible(true);
		field.set(entity, id);
	}
}
