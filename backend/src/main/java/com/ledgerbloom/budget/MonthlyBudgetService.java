package com.ledgerbloom.budget;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.category.Category;
import com.ledgerbloom.category.CategoryNotFoundException;
import com.ledgerbloom.category.CategoryRepository;
import com.ledgerbloom.expense.Expense;
import com.ledgerbloom.expense.ExpenseRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class MonthlyBudgetService {

	private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");
	/**
	 * Percent used is actual / limit * 100, scale 2, RoundingMode.HALF_UP.
	 * Limits are always positive so division by zero cannot occur.
	 */
	private static final int PERCENT_SCALE = 2;
	private static final RoundingMode PERCENT_ROUNDING = RoundingMode.HALF_UP;

	private final MonthlyBudgetRepository monthlyBudgetRepository;
	private final CategoryBudgetLimitRepository categoryBudgetLimitRepository;
	private final CategoryRepository categoryRepository;
	private final ExpenseRepository expenseRepository;
	private final CurrentUser currentUser;

	public MonthlyBudgetService(
			MonthlyBudgetRepository monthlyBudgetRepository,
			CategoryBudgetLimitRepository categoryBudgetLimitRepository,
			CategoryRepository categoryRepository,
			ExpenseRepository expenseRepository,
			CurrentUser currentUser) {
		this.monthlyBudgetRepository = monthlyBudgetRepository;
		this.categoryBudgetLimitRepository = categoryBudgetLimitRepository;
		this.categoryRepository = categoryRepository;
		this.expenseRepository = expenseRepository;
		this.currentUser = currentUser;
	}

	@Transactional(readOnly = true)
	public MonthlyBudgetResponse getByYearAndMonth(Integer year, Integer month) {
		validatePeriod(year, month);
		Long userId = currentUser.requireUserId();
		MonthlyBudget budget = monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(userId, year, month)
			.orElseThrow(() -> new MonthlyBudgetNotFoundException(year, month));
		return toResponse(budget);
	}

	@Transactional(readOnly = true)
	public Optional<MonthlyBudgetResponse> findOptionalByYearAndMonth(Integer year, Integer month) {
		validatePeriod(year, month);
		Long userId = currentUser.requireUserId();
		return monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(userId, year, month)
			.map(this::toResponse);
	}

	public MonthlyBudgetResponse create(MonthlyBudgetCreateRequest request) {
		validatePeriod(request.year(), request.month());
		BigDecimal totalLimit = validateAmount(request.totalLimit(), "Total limit");
		Long userId = currentUser.requireUserId();

		if (monthlyBudgetRepository.existsByUser_IdAndBudgetYearAndBudgetMonth(userId, request.year(), request.month())) {
			throw new MonthlyBudgetAlreadyExistsException(request.year(), request.month());
		}

		MonthlyBudget budget = new MonthlyBudget(currentUser.requireUserReference(), request.year(), request.month(), totalLimit);
		try {
			return toResponse(monthlyBudgetRepository.saveAndFlush(budget));
		}
		catch (DataIntegrityViolationException ex) {
			throw new MonthlyBudgetAlreadyExistsException(request.year(), request.month());
		}
	}

	public MonthlyBudgetResponse update(Long id, MonthlyBudgetUpdateRequest request) {
		MonthlyBudget budget = getBudgetOrThrow(id, currentUser.requireUserId());
		budget.setTotalLimit(validateAmount(request.totalLimit(), "Total limit"));
		return toResponse(monthlyBudgetRepository.saveAndFlush(budget));
	}

	public void delete(Long id) {
		MonthlyBudget budget = getBudgetOrThrow(id, currentUser.requireUserId());
		monthlyBudgetRepository.delete(budget);
	}

	public MonthlyBudgetResponse createCategoryLimit(Long budgetId, CategoryBudgetLimitCreateRequest request) {
		Long userId = currentUser.requireUserId();
		MonthlyBudget budget = getBudgetOrThrow(budgetId, userId);
		Long categoryId = request.categoryId();
		if (categoryId == null || categoryId <= 0) {
			throw new InvalidBudgetDataException("Category id must be positive");
		}
		BigDecimal limitAmount = validateAmount(request.limitAmount(), "Limit amount");
		Category category = categoryRepository.findByIdAndUser_Id(categoryId, userId)
			.orElseThrow(() -> new CategoryNotFoundException(categoryId));

		if (categoryBudgetLimitRepository.existsByMonthlyBudget_IdAndCategory_IdAndUser_Id(budgetId, categoryId, userId)) {
			throw new CategoryBudgetAlreadyExistsException(budgetId, categoryId);
		}

		CategoryBudgetLimit limit = new CategoryBudgetLimit(currentUser.requireUserReference(), budget, category, limitAmount);
		try {
			categoryBudgetLimitRepository.saveAndFlush(limit);
		}
		catch (DataIntegrityViolationException ex) {
			throw new CategoryBudgetAlreadyExistsException(budgetId, categoryId);
		}
		return toResponse(budget);
	}

	public MonthlyBudgetResponse updateCategoryLimit(
			Long budgetId,
			Long limitId,
			CategoryBudgetLimitUpdateRequest request) {
		Long userId = currentUser.requireUserId();
		getBudgetOrThrow(budgetId, userId);
		CategoryBudgetLimit limit = categoryBudgetLimitRepository.findByIdAndMonthlyBudget_IdAndUser_Id(limitId, budgetId, userId)
			.orElseThrow(() -> new CategoryBudgetLimitNotFoundException(budgetId, limitId));
		limit.setLimitAmount(validateAmount(request.limitAmount(), "Limit amount"));
		categoryBudgetLimitRepository.saveAndFlush(limit);
		return toResponse(getBudgetOrThrow(budgetId, userId));
	}

	public MonthlyBudgetResponse deleteCategoryLimit(Long budgetId, Long limitId) {
		Long userId = currentUser.requireUserId();
		MonthlyBudget budget = getBudgetOrThrow(budgetId, userId);
		CategoryBudgetLimit limit = categoryBudgetLimitRepository.findByIdAndMonthlyBudget_IdAndUser_Id(limitId, budgetId, userId)
			.orElseThrow(() -> new CategoryBudgetLimitNotFoundException(budgetId, limitId));
		categoryBudgetLimitRepository.delete(limit);
		categoryBudgetLimitRepository.flush();
		return toResponse(budget);
	}

	private MonthlyBudget getBudgetOrThrow(Long id, Long userId) {
		return monthlyBudgetRepository.findByIdAndUser_Id(id, userId)
			.orElseThrow(() -> new MonthlyBudgetNotFoundException(id));
	}

	private void validatePeriod(Integer year, Integer month) {
		if (year == null || month == null) {
			throw new InvalidBudgetFilterException("year and month must both be provided");
		}
		if (month < 1 || month > 12) {
			throw new InvalidBudgetFilterException("month must be between 1 and 12");
		}
		if (year < 1 || year > 9999) {
			throw new InvalidBudgetFilterException("year must be a positive value between 1 and 9999");
		}
	}

	private BigDecimal validateAmount(BigDecimal amount, String fieldLabel) {
		if (amount == null) {
			throw new InvalidBudgetDataException(fieldLabel + " is required");
		}
		if (amount.compareTo(BigDecimal.ZERO) <= 0) {
			throw new InvalidBudgetDataException(fieldLabel + " must be greater than zero");
		}
		if (amount.scale() > 2) {
			throw new InvalidBudgetDataException(fieldLabel + " must have at most 2 decimal places");
		}
		if (amount.compareTo(MAX_AMOUNT) > 0) {
			throw new InvalidBudgetDataException(fieldLabel + " must fit NUMERIC(12,2)");
		}
		return amount;
	}

	private MonthlyBudgetResponse toResponse(MonthlyBudget budget) {
		LocalDate start = YearMonth.of(budget.getBudgetYear(), budget.getBudgetMonth()).atDay(1);
		LocalDate endExclusive = start.plusMonths(1);

		List<Expense> expenses = expenseRepository
			.findByUser_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
				budget.getUser().getId(),
				start,
				endExclusive
			);

		BigDecimal actualExpenses = sumAmounts(expenses.stream().map(Expense::getAmount).toList());
		BigDecimal totalLimit = budget.getTotalLimit();
		BigDecimal remaining = totalLimit.subtract(actualExpenses).setScale(2, RoundingMode.HALF_UP);
		boolean overBudget = actualExpenses.compareTo(totalLimit) > 0;
		BigDecimal percentUsed = percentUsed(actualExpenses, totalLimit);

		Map<Long, BigDecimal> spentByCategory = new HashMap<>();
		for (Expense expense : expenses) {
			Long categoryId = expense.getCategory().getId();
			spentByCategory.merge(categoryId, expense.getAmount(), BigDecimal::add);
		}

		List<CategoryBudgetLimit> limits = categoryBudgetLimitRepository
			.findByMonthlyBudget_IdOrderByIdAsc(budget.getId());

		List<CategoryBudgetLimitResponse> categoryLimitResponses = new ArrayList<>();
		for (CategoryBudgetLimit limit : limits) {
			Category category = limit.getCategory();
			BigDecimal limitAmount = limit.getLimitAmount();
			BigDecimal actualSpent = spentByCategory
				.getOrDefault(category.getId(), BigDecimal.ZERO)
				.setScale(2, RoundingMode.HALF_UP);
			BigDecimal categoryRemaining = limitAmount.subtract(actualSpent).setScale(2, RoundingMode.HALF_UP);
			boolean categoryOverBudget = actualSpent.compareTo(limitAmount) > 0;
			categoryLimitResponses.add(new CategoryBudgetLimitResponse(
				limit.getId(),
				new BudgetCategorySummary(category.getId(), category.getName()),
				limitAmount,
				actualSpent,
				categoryRemaining,
				percentUsed(actualSpent, limitAmount),
				categoryOverBudget
			));
		}

		categoryLimitResponses.sort(
			Comparator.comparing((CategoryBudgetLimitResponse row) -> row.category().name(), String.CASE_INSENSITIVE_ORDER)
				.thenComparing(CategoryBudgetLimitResponse::id)
		);

		return new MonthlyBudgetResponse(
			budget.getId(),
			budget.getBudgetYear(),
			budget.getBudgetMonth(),
			totalLimit,
			actualExpenses,
			remaining,
			percentUsed,
			overBudget,
			expenses.size(),
			List.copyOf(categoryLimitResponses),
			budget.getCreatedAt(),
			budget.getUpdatedAt()
		);
	}

	private BigDecimal sumAmounts(List<BigDecimal> amounts) {
		BigDecimal total = BigDecimal.ZERO;
		for (BigDecimal amount : amounts) {
			total = total.add(amount);
		}
		return total.setScale(2, RoundingMode.HALF_UP);
	}

	private BigDecimal percentUsed(BigDecimal actual, BigDecimal limit) {
		return actual
			.multiply(new BigDecimal("100"))
			.divide(limit, PERCENT_SCALE, PERCENT_ROUNDING);
	}
}
