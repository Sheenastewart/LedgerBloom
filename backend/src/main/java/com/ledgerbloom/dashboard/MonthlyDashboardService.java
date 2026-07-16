package com.ledgerbloom.dashboard;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.budget.MonthlyBudgetResponse;
import com.ledgerbloom.budget.MonthlyBudgetService;
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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MonthlyDashboardService {

	private final ExpenseRepository expenseRepository;
	private final IncomeEntryRepository incomeEntryRepository;
	private final MonthlyBudgetService monthlyBudgetService;
	private final RecurringExpenseRepository recurringExpenseRepository;
	private final RecurringIncomeRepository recurringIncomeRepository;
	private final CurrentUser currentUser;

	public MonthlyDashboardService(
			ExpenseRepository expenseRepository,
			IncomeEntryRepository incomeEntryRepository,
			MonthlyBudgetService monthlyBudgetService,
			RecurringExpenseRepository recurringExpenseRepository,
			RecurringIncomeRepository recurringIncomeRepository,
			CurrentUser currentUser) {
		this.expenseRepository = expenseRepository;
		this.incomeEntryRepository = incomeEntryRepository;
		this.monthlyBudgetService = monthlyBudgetService;
		this.recurringExpenseRepository = recurringExpenseRepository;
		this.recurringIncomeRepository = recurringIncomeRepository;
		this.currentUser = currentUser;
	}

	@Transactional(readOnly = true)
	public MonthlyDashboardResponse getMonthlyDashboard(Integer year, Integer month) {
		validatePeriod(year, month);
		Long userId = currentUser.requireUserId();

		YearMonth yearMonth = YearMonth.of(year, month);
		LocalDate start = yearMonth.atDay(1);
		LocalDate endExclusive = start.plusMonths(1);
		LocalDate monthEnd = yearMonth.atEndOfMonth();

		List<IncomeEntry> incomeEntries = incomeEntryRepository
			.findByUser_IdAndIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
				userId,
				start,
				endExclusive
			);
		List<Expense> expenses = expenseRepository
			.findByUser_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
				userId,
				start,
				endExclusive
			);

		BigDecimal totalIncome = sumAmounts(incomeEntries.stream().map(IncomeEntry::getAmount).toList());
		BigDecimal totalExpenses = sumAmounts(expenses.stream().map(Expense::getAmount).toList());
		BigDecimal netCashFlow = totalIncome.subtract(totalExpenses).setScale(2, RoundingMode.HALF_UP);

		DashboardBudgetSummary budgetSummary = monthlyBudgetService
			.findOptionalByYearAndMonth(year, month)
			.map(this::toBudgetSummary)
			.orElse(null);

		DashboardCashFlowPlanning planning = buildPlanning(userId, totalIncome, totalExpenses, start, monthEnd);

		return new MonthlyDashboardResponse(
			year,
			month,
			totalIncome,
			totalExpenses,
			netCashFlow,
			incomeEntries.size(),
			expenses.size(),
			buildSpendingByCategory(expenses),
			buildIncomeBySource(incomeEntries),
			findLargestExpense(expenses),
			findLargestIncome(incomeEntries),
			budgetSummary,
			planning
		);
	}

	private DashboardCashFlowPlanning buildPlanning(
			Long userId,
			BigDecimal actualIncome,
			BigDecimal actualExpenses,
			LocalDate monthStart,
			LocalDate monthEnd) {
		List<RecurringIncome> upcomingIncome = recurringIncomeRepository.findActiveInMonth(userId, monthStart, monthEnd);
		List<RecurringExpense> upcomingExpenses = recurringExpenseRepository.findActiveInMonth(userId, monthStart, monthEnd);

		BigDecimal expectedIncome = sumAmounts(upcomingIncome.stream().map(RecurringIncome::getAmount).toList());
		BigDecimal expectedExpenses = sumAmounts(upcomingExpenses.stream().map(RecurringExpense::getAmount).toList());
		BigDecimal projectedCashFlow = actualIncome
			.add(expectedIncome)
			.subtract(actualExpenses)
			.subtract(expectedExpenses)
			.setScale(2, RoundingMode.HALF_UP);

		List<DashboardUpcomingIncomeItem> incomeItems = upcomingIncome.stream()
			.map(item -> new DashboardUpcomingIncomeItem(
				item.getId(),
				item.getDescription(),
				item.getSource(),
				item.getAmount().setScale(2, RoundingMode.HALF_UP),
				item.getNextIncomeDate(),
				item.getCadence().name()
			))
			.toList();

		List<DashboardUpcomingExpenseItem> expenseItems = upcomingExpenses.stream()
			.map(item -> new DashboardUpcomingExpenseItem(
				item.getId(),
				item.getDescription(),
				item.getCategory().getName(),
				item.getAmount().setScale(2, RoundingMode.HALF_UP),
				item.getNextPaymentDate(),
				item.getCadence().name()
			))
			.toList();

		return new DashboardCashFlowPlanning(
			expectedIncome,
			expectedExpenses,
			projectedCashFlow,
			incomeItems.size(),
			expenseItems.size(),
			incomeItems,
			expenseItems
		);
	}

	private DashboardBudgetSummary toBudgetSummary(MonthlyBudgetResponse budget) {
		return new DashboardBudgetSummary(
			budget.id(),
			budget.totalLimit(),
			budget.actualExpenses(),
			budget.remaining(),
			budget.percentUsed(),
			budget.overBudget()
		);
	}

	private void validatePeriod(Integer year, Integer month) {
		if (year == null || month == null) {
			throw new InvalidDashboardFilterException("year and month must both be provided");
		}
		if (month < 1 || month > 12) {
			throw new InvalidDashboardFilterException("month must be between 1 and 12");
		}
		if (year < 1 || year > 9999) {
			throw new InvalidDashboardFilterException("year must be a positive value between 1 and 9999");
		}
	}

	private BigDecimal sumAmounts(List<BigDecimal> amounts) {
		BigDecimal total = BigDecimal.ZERO;
		for (BigDecimal amount : amounts) {
			total = total.add(amount);
		}
		return total.setScale(2, RoundingMode.HALF_UP);
	}

	private List<CategorySpendingTotal> buildSpendingByCategory(List<Expense> expenses) {
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

	private List<SourceIncomeTotal> buildIncomeBySource(List<IncomeEntry> incomeEntries) {
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

	private LargestExpenseSummary findLargestExpense(List<Expense> expenses) {
		Expense largest = null;
		for (Expense expense : expenses) {
			if (largest == null || expense.getAmount().compareTo(largest.getAmount()) > 0) {
				largest = expense;
			}
			else if (expense.getAmount().compareTo(largest.getAmount()) == 0
					&& expense.getId().compareTo(largest.getId()) > 0) {
				largest = expense;
			}
		}
		if (largest == null) {
			return null;
		}
		return new LargestExpenseSummary(
			largest.getId(),
			largest.getDescription(),
			largest.getAmount().setScale(2, RoundingMode.HALF_UP),
			largest.getExpenseDate(),
			largest.getCategory().getName()
		);
	}

	private LargestIncomeSummary findLargestIncome(List<IncomeEntry> incomeEntries) {
		IncomeEntry largest = null;
		for (IncomeEntry entry : incomeEntries) {
			if (largest == null || entry.getAmount().compareTo(largest.getAmount()) > 0) {
				largest = entry;
			}
			else if (entry.getAmount().compareTo(largest.getAmount()) == 0
					&& entry.getId().compareTo(largest.getId()) > 0) {
				largest = entry;
			}
		}
		if (largest == null) {
			return null;
		}
		return new LargestIncomeSummary(
			largest.getId(),
			largest.getDescription(),
			largest.getAmount().setScale(2, RoundingMode.HALF_UP),
			largest.getIncomeDate(),
			largest.getSource()
		);
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
