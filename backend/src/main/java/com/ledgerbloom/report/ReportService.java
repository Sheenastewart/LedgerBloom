package com.ledgerbloom.report;

import com.ledgerbloom.budget.MonthlyBudgetResponse;
import com.ledgerbloom.budget.MonthlyBudgetService;
import com.ledgerbloom.dashboard.CategorySpendingTotal;
import com.ledgerbloom.dashboard.SourceIncomeTotal;
import com.ledgerbloom.expense.Expense;
import com.ledgerbloom.expense.ExpenseRepository;
import com.ledgerbloom.income.IncomeEntry;
import com.ledgerbloom.income.IncomeEntryRepository;
import com.ledgerbloom.recurring.RecurringExpense;
import com.ledgerbloom.recurring.RecurringExpenseRepository;
import com.ledgerbloom.recurringincome.RecurringIncome;
import com.ledgerbloom.recurringincome.RecurringIncomeRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportService {

	static final int MAX_COMPARISON_MONTHS = 24;

	private final ExpenseRepository expenseRepository;
	private final IncomeEntryRepository incomeEntryRepository;
	private final MonthlyBudgetService monthlyBudgetService;
	private final RecurringExpenseRepository recurringExpenseRepository;
	private final RecurringIncomeRepository recurringIncomeRepository;

	public ReportService(
			ExpenseRepository expenseRepository,
			IncomeEntryRepository incomeEntryRepository,
			MonthlyBudgetService monthlyBudgetService,
			RecurringExpenseRepository recurringExpenseRepository,
			RecurringIncomeRepository recurringIncomeRepository) {
		this.expenseRepository = expenseRepository;
		this.incomeEntryRepository = incomeEntryRepository;
		this.monthlyBudgetService = monthlyBudgetService;
		this.recurringExpenseRepository = recurringExpenseRepository;
		this.recurringIncomeRepository = recurringIncomeRepository;
	}

	@Transactional(readOnly = true)
	public MonthlyComparisonResponse getMonthlyComparison(
			Integer startYear,
			Integer startMonth,
			Integer endYear,
			Integer endMonth) {
		validatePeriod(startYear, startMonth);
		validatePeriod(endYear, endMonth);

		YearMonth start = YearMonth.of(startYear, startMonth);
		YearMonth end = YearMonth.of(endYear, endMonth);

		if (start.isAfter(end)) {
			throw new InvalidReportPeriodException("Start period must not be after end period");
		}

		long monthCount = ChronoUnit.MONTHS.between(start, end) + 1;
		if (monthCount > MAX_COMPARISON_MONTHS) {
			throw new ReportRangeTooLargeException(
				"Requested report range spans " + monthCount + " months; max is "
					+ MAX_COMPARISON_MONTHS + " months"
			);
		}

		List<MonthlyComparisonItem> months = buildMonthsInRange(start, end);

		return new MonthlyComparisonResponse(startYear, startMonth, endYear, endMonth, months.size(), months);
	}

	@Transactional(readOnly = true)
	public YearToDateResponse getYearToDate(Integer year) {
		if (year == null) {
			throw new InvalidReportPeriodException("year must be provided");
		}
		if (year < 1 || year > 9999) {
			throw new InvalidReportPeriodException("year must be a positive value between 1 and 9999");
		}

		LocalDate today = LocalDate.now();
		if (year > today.getYear()) {
			throw new InvalidReportPeriodException("Cannot report on a future year");
		}

		int endMonthValue = (year == today.getYear()) ? today.getMonthValue() : 12;
		YearMonth start = YearMonth.of(year, 1);
		YearMonth end = YearMonth.of(year, endMonthValue);

		List<MonthlyComparisonItem> monthSummaries = buildMonthsInRange(start, end);
		int monthCount = monthSummaries.size();

		BigDecimal totalIncome = sumAmounts(monthSummaries.stream().map(MonthlyComparisonItem::totalIncome).toList());
		BigDecimal totalExpenses = sumAmounts(monthSummaries.stream().map(MonthlyComparisonItem::totalExpenses).toList());
		BigDecimal netCashFlow = totalIncome.subtract(totalExpenses).setScale(2, RoundingMode.HALF_UP);

		YearToDateTotals totals = new YearToDateTotals(totalIncome, totalExpenses, netCashFlow);
		YearToDateAverages averages = new YearToDateAverages(
			divideByCount(totalIncome, monthCount),
			divideByCount(totalExpenses, monthCount),
			divideByCount(netCashFlow, monthCount)
		);

		MonthMetricSummary highestIncomeMonth = pickExtreme(monthSummaries, MonthlyComparisonItem::totalIncome, true);
		MonthMetricSummary highestExpenseMonth = pickExtreme(monthSummaries, MonthlyComparisonItem::totalExpenses, true);
		MonthMetricSummary bestNetCashFlowMonth = pickExtreme(monthSummaries, MonthlyComparisonItem::netCashFlow, true);
		MonthMetricSummary worstNetCashFlowMonth = pickExtreme(monthSummaries, MonthlyComparisonItem::netCashFlow, false);

		BigDecimal totalBudgeted = sumAmounts(
			monthSummaries.stream().map(MonthlyComparisonItem::budgetLimit).filter(Objects::nonNull).toList()
		);
		BigDecimal totalBudgetRemaining = sumAmounts(
			monthSummaries.stream().map(MonthlyComparisonItem::remainingBudget).filter(Objects::nonNull).toList()
		);
		long monthsOverBudget = monthSummaries.stream()
			.filter(item -> Boolean.TRUE.equals(item.overBudget()))
			.count();

		LocalDate yearStart = LocalDate.of(year, 1, 1);
		LocalDate endExclusive = end.atDay(1).plusMonths(1);
		List<Expense> yearExpenses = expenseRepository
			.findByExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
				yearStart,
				endExclusive
			);
		List<IncomeEntry> yearIncome = incomeEntryRepository
			.findByIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
				yearStart,
				endExclusive
			);

		List<CategorySpendingTotal> spendingByCategory = buildSpendingByCategory(yearExpenses);
		List<SourceIncomeTotal> incomeBySource = buildIncomeBySource(yearIncome);

		return new YearToDateResponse(
			year,
			totals,
			averages,
			highestIncomeMonth,
			highestExpenseMonth,
			bestNetCashFlowMonth,
			worstNetCashFlowMonth,
			totalBudgeted,
			totalBudgetRemaining,
			monthsOverBudget,
			spendingByCategory,
			incomeBySource,
			monthSummaries
		);
	}

	private List<MonthlyComparisonItem> buildMonthsInRange(YearMonth start, YearMonth end) {
		List<MonthlyComparisonItem> months = new ArrayList<>();
		YearMonth cursor = start;
		while (!cursor.isAfter(end)) {
			months.add(buildMonthItem(cursor));
			cursor = cursor.plusMonths(1);
		}
		return List.copyOf(months);
	}

	private MonthlyComparisonItem buildMonthItem(YearMonth yearMonth) {
		LocalDate monthStart = yearMonth.atDay(1);
		LocalDate monthEndExclusive = monthStart.plusMonths(1);
		LocalDate monthEnd = yearMonth.atEndOfMonth();

		List<IncomeEntry> incomeEntries = incomeEntryRepository
			.findByIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
				monthStart,
				monthEndExclusive
			);
		List<Expense> expenses = expenseRepository
			.findByExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
				monthStart,
				monthEndExclusive
			);

		BigDecimal totalIncome = sumAmounts(incomeEntries.stream().map(IncomeEntry::getAmount).toList());
		BigDecimal totalExpenses = sumAmounts(expenses.stream().map(Expense::getAmount).toList());
		BigDecimal netCashFlow = totalIncome.subtract(totalExpenses).setScale(2, RoundingMode.HALF_UP);

		Optional<MonthlyBudgetResponse> budget = monthlyBudgetService
			.findOptionalByYearAndMonth(yearMonth.getYear(), yearMonth.getMonthValue());
		BigDecimal budgetLimit = budget.map(MonthlyBudgetResponse::totalLimit).orElse(null);
		BigDecimal remainingBudget = budget.map(MonthlyBudgetResponse::remaining).orElse(null);
		BigDecimal budgetPercentUsed = budget.map(MonthlyBudgetResponse::percentUsed).orElse(null);
		Boolean overBudget = budget.map(MonthlyBudgetResponse::overBudget).orElse(null);

		List<RecurringIncome> upcomingIncome = recurringIncomeRepository.findActiveInMonth(monthStart, monthEnd);
		List<RecurringExpense> upcomingExpenses = recurringExpenseRepository.findActiveInMonth(monthStart, monthEnd);
		BigDecimal expectedRecurringIncome = sumAmounts(
			upcomingIncome.stream().map(RecurringIncome::getAmount).toList()
		);
		BigDecimal expectedRecurringExpenses = sumAmounts(
			upcomingExpenses.stream().map(RecurringExpense::getAmount).toList()
		);

		BigDecimal projectedCashFlow = totalIncome
			.add(expectedRecurringIncome)
			.subtract(totalExpenses)
			.subtract(expectedRecurringExpenses)
			.setScale(2, RoundingMode.HALF_UP);

		return new MonthlyComparisonItem(
			yearMonth.getYear(),
			yearMonth.getMonthValue(),
			totalIncome,
			totalExpenses,
			netCashFlow,
			incomeEntries.size(),
			expenses.size(),
			budgetLimit,
			remainingBudget,
			budgetPercentUsed,
			overBudget,
			expectedRecurringIncome,
			expectedRecurringExpenses,
			projectedCashFlow
		);
	}

	private MonthMetricSummary pickExtreme(
			List<MonthlyComparisonItem> months,
			Function<MonthlyComparisonItem, BigDecimal> extractor,
			boolean highest) {
		MonthlyComparisonItem best = null;
		for (MonthlyComparisonItem item : months) {
			if (best == null) {
				best = item;
				continue;
			}
			int comparison = extractor.apply(item).compareTo(extractor.apply(best));
			if ((highest && comparison > 0) || (!highest && comparison < 0)) {
				best = item;
			}
		}
		if (best == null) {
			return null;
		}
		return new MonthMetricSummary(best.year(), best.month(), extractor.apply(best));
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

	private BigDecimal sumAmounts(List<BigDecimal> amounts) {
		BigDecimal total = BigDecimal.ZERO;
		for (BigDecimal amount : amounts) {
			total = total.add(amount);
		}
		return total.setScale(2, RoundingMode.HALF_UP);
	}

	private BigDecimal divideByCount(BigDecimal total, int count) {
		if (count == 0) {
			return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		}
		return total.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
	}

	static List<CategorySpendingTotal> buildSpendingByCategory(List<Expense> expenses) {
		Map<Long, Accumulator> byCategory = new LinkedHashMap<>();
		Map<Long, String> names = new LinkedHashMap<>();

		for (Expense expense : expenses) {
			Long categoryId = expense.getCategory().getId();
			names.putIfAbsent(categoryId, expense.getCategory().getName());
			Accumulator accumulator = byCategory.computeIfAbsent(categoryId, id -> new Accumulator());
			accumulator.add(expense.getAmount());
		}

		List<CategorySpendingTotal> totals = new ArrayList<>();
		for (Map.Entry<Long, Accumulator> entry : byCategory.entrySet()) {
			Long categoryId = entry.getKey();
			Accumulator accumulator = entry.getValue();
			totals.add(new CategorySpendingTotal(
				categoryId,
				names.get(categoryId),
				accumulator.total.setScale(2, RoundingMode.HALF_UP),
				accumulator.count
			));
		}

		totals.sort(
			Comparator.comparing(CategorySpendingTotal::total)
				.reversed()
				.thenComparing(CategorySpendingTotal::categoryName, String.CASE_INSENSITIVE_ORDER)
		);
		return List.copyOf(totals);
	}

	static List<SourceIncomeTotal> buildIncomeBySource(List<IncomeEntry> incomeEntries) {
		Map<String, Accumulator> bySourceKey = new LinkedHashMap<>();
		Map<String, String> displayNames = new LinkedHashMap<>();

		for (IncomeEntry entry : incomeEntries) {
			String displaySource = entry.getSource();
			String key = displaySource.toLowerCase(Locale.ROOT);
			displayNames.putIfAbsent(key, displaySource);
			Accumulator accumulator = bySourceKey.computeIfAbsent(key, ignored -> new Accumulator());
			accumulator.add(entry.getAmount());
		}

		List<SourceIncomeTotal> totals = new ArrayList<>();
		for (Map.Entry<String, Accumulator> entry : bySourceKey.entrySet()) {
			String key = entry.getKey();
			Accumulator accumulator = entry.getValue();
			totals.add(new SourceIncomeTotal(
				displayNames.get(key),
				accumulator.total.setScale(2, RoundingMode.HALF_UP),
				accumulator.count
			));
		}

		totals.sort(
			Comparator.comparing(SourceIncomeTotal::total)
				.reversed()
				.thenComparing(SourceIncomeTotal::source, String.CASE_INSENSITIVE_ORDER)
		);
		return List.copyOf(totals);
	}

	private static final class Accumulator {
		private BigDecimal total = BigDecimal.ZERO;
		private long count;

		private void add(BigDecimal amount) {
			total = total.add(amount);
			count++;
		}
	}
}
