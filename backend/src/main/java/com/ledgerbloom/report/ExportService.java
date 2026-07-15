package com.ledgerbloom.report;

import com.ledgerbloom.dashboard.CategorySpendingTotal;
import com.ledgerbloom.dashboard.SourceIncomeTotal;
import com.ledgerbloom.expense.Expense;
import com.ledgerbloom.expense.ExpenseRepository;
import com.ledgerbloom.income.IncomeEntry;
import com.ledgerbloom.income.IncomeEntryRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExportService {

	private static final String CSV_LINE_TERMINATOR = "\r\n";

	private final ExpenseRepository expenseRepository;
	private final IncomeEntryRepository incomeEntryRepository;
	private final ReportService reportService;

	public ExportService(
			ExpenseRepository expenseRepository,
			IncomeEntryRepository incomeEntryRepository,
			ReportService reportService) {
		this.expenseRepository = expenseRepository;
		this.incomeEntryRepository = incomeEntryRepository;
		this.reportService = reportService;
	}

	@Transactional(readOnly = true)
	public CsvExport generateMonthlyTransactionsCsv(Integer year, Integer month) {
		validatePeriod(year, month);

		try {
			YearMonth yearMonth = YearMonth.of(year, month);
			LocalDate start = yearMonth.atDay(1);
			LocalDate endExclusive = start.plusMonths(1);

			List<IncomeEntry> incomeEntries = incomeEntryRepository
				.findByIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
					start,
					endExclusive
				);
			List<Expense> expenses = expenseRepository
				.findByExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
					start,
					endExclusive
				);

			List<TransactionRow> rows = new ArrayList<>();
			for (IncomeEntry entry : incomeEntries) {
				rows.add(new TransactionRow(
					entry.getIncomeDate(),
					"INCOME",
					entry.getDescription(),
					entry.getSource(),
					"",
					entry.getAmount().setScale(2, RoundingMode.HALF_UP),
					entry.getNotes()
				));
			}
			for (Expense expense : expenses) {
				rows.add(new TransactionRow(
					expense.getExpenseDate(),
					"EXPENSE",
					expense.getDescription(),
					expense.getMerchant() == null ? "" : expense.getMerchant(),
					expense.getCategory().getName(),
					expense.getAmount().setScale(2, RoundingMode.HALF_UP),
					expense.getNotes()
				));
			}

			rows.sort(
				Comparator.comparing(TransactionRow::date)
					.reversed()
					.thenComparing(TransactionRow::type)
			);

			StringBuilder csv = new StringBuilder();
			csv.append(CsvUtil.toCsvLine("Type", "Date", "Description", "SourceOrMerchant", "Category", "Amount", "Notes"))
				.append(CSV_LINE_TERMINATOR);
			for (TransactionRow row : rows) {
				csv.append(CsvUtil.toCsvLine(
					row.type(),
					row.date().toString(),
					row.description(),
					row.sourceOrMerchant(),
					row.category(),
					row.amount().toPlainString(),
					row.notes() == null ? "" : row.notes()
				)).append(CSV_LINE_TERMINATOR);
			}

			String filename = String.format("ledgerbloom-transactions-%04d-%02d.csv", year, month);
			return new CsvExport(filename, csv.toString());
		}
		catch (RuntimeException ex) {
			throw new ExportGenerationFailedException("Failed to generate monthly transactions export", ex);
		}
	}

	@Transactional(readOnly = true)
	public CsvExport generateMonthlySummaryCsv(Integer year, Integer month) {
		validatePeriod(year, month);

		try {
			MonthlyComparisonResponse comparison = reportService.getMonthlyComparison(year, month, year, month);
			MonthlyComparisonItem item = comparison.months().get(0);

			YearMonth yearMonth = YearMonth.of(year, month);
			LocalDate start = yearMonth.atDay(1);
			LocalDate endExclusive = start.plusMonths(1);

			List<Expense> expenses = expenseRepository
				.findByExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
					start,
					endExclusive
				);
			List<IncomeEntry> incomeEntries = incomeEntryRepository
				.findByIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
					start,
					endExclusive
				);

			List<CategorySpendingTotal> categoryTotals = ReportService.buildSpendingByCategory(expenses);
			List<SourceIncomeTotal> sourceTotals = ReportService.buildIncomeBySource(incomeEntries);

			StringBuilder csv = new StringBuilder();
			csv.append(CsvUtil.toCsvLine("Monthly Summary", String.valueOf(year), String.format("%02d", month)))
				.append(CSV_LINE_TERMINATOR)
				.append(CSV_LINE_TERMINATOR);

			csv.append(CsvUtil.toCsvLine("Metric", "Value")).append(CSV_LINE_TERMINATOR);
			appendMetric(csv, "Total Income", item.totalIncome());
			appendMetric(csv, "Total Expenses", item.totalExpenses());
			appendMetric(csv, "Net Cash Flow", item.netCashFlow());
			csv.append(CsvUtil.toCsvLine("Income Entries", String.valueOf(item.incomeCount())))
				.append(CSV_LINE_TERMINATOR);
			csv.append(CsvUtil.toCsvLine("Expense Entries", String.valueOf(item.expenseCount())))
				.append(CSV_LINE_TERMINATOR);
			appendMetric(csv, "Budget Limit", item.budgetLimit());
			appendMetric(csv, "Remaining Budget", item.remainingBudget());
			appendMetric(csv, "Budget Percent Used", item.budgetPercentUsed());
			csv.append(CsvUtil.toCsvLine("Over Budget", item.overBudget() == null ? "" : item.overBudget().toString()))
				.append(CSV_LINE_TERMINATOR);
			appendMetric(csv, "Expected Recurring Income", item.expectedRecurringIncome());
			appendMetric(csv, "Expected Recurring Expenses", item.expectedRecurringExpenses());
			appendMetric(csv, "Projected Cash Flow", item.projectedCashFlow());
			csv.append(CSV_LINE_TERMINATOR);

			csv.append(CsvUtil.toCsvLine("Spending By Category")).append(CSV_LINE_TERMINATOR);
			csv.append(CsvUtil.toCsvLine("Category", "Total", "Entry Count")).append(CSV_LINE_TERMINATOR);
			for (CategorySpendingTotal total : categoryTotals) {
				csv.append(CsvUtil.toCsvLine(
					total.categoryName(),
					total.total().toPlainString(),
					String.valueOf(total.entryCount())
				)).append(CSV_LINE_TERMINATOR);
			}
			csv.append(CSV_LINE_TERMINATOR);

			csv.append(CsvUtil.toCsvLine("Income By Source")).append(CSV_LINE_TERMINATOR);
			csv.append(CsvUtil.toCsvLine("Source", "Total", "Entry Count")).append(CSV_LINE_TERMINATOR);
			for (SourceIncomeTotal total : sourceTotals) {
				csv.append(CsvUtil.toCsvLine(
					total.source(),
					total.total().toPlainString(),
					String.valueOf(total.entryCount())
				)).append(CSV_LINE_TERMINATOR);
			}

			String filename = String.format("ledgerbloom-summary-%04d-%02d.csv", year, month);
			return new CsvExport(filename, csv.toString());
		}
		catch (InvalidReportPeriodException | ReportRangeTooLargeException ex) {
			throw ex;
		}
		catch (RuntimeException ex) {
			throw new ExportGenerationFailedException("Failed to generate monthly summary export", ex);
		}
	}

	private void appendMetric(StringBuilder csv, String label, BigDecimal value) {
		csv.append(CsvUtil.toCsvLine(label, value == null ? "" : value.toPlainString()))
			.append(CSV_LINE_TERMINATOR);
	}

	private void validatePeriod(Integer year, Integer month) {
		if (year == null || month == null) {
			throw new InvalidReportPeriodException("year and month must both be provided");
		}
		if (month < 1 || month > 12) {
			throw new InvalidReportPeriodException("month must be between 1 and 12");
		}
		if (year < 1 || year > 9999) {
			throw new InvalidReportPeriodException("year must be a positive value between 1 and 9999");
		}
	}

	private record TransactionRow(
			LocalDate date,
			String type,
			String description,
			String sourceOrMerchant,
			String category,
			BigDecimal amount,
			String notes
	) {
	}
}
