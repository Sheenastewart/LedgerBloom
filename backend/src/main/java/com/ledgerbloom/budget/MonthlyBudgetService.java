package com.ledgerbloom.budget;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.category.Category;
import com.ledgerbloom.expense.Expense;
import com.ledgerbloom.expense.ExpenseRepository;
import com.ledgerbloom.recurring.RecurringExpense;
import com.ledgerbloom.recurring.RecurringExpenseRepository;
import com.ledgerbloom.recurring.support.RecurringPeriodProjection;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
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
	private static final int PERCENT_SCALE = 2;
	private static final RoundingMode PERCENT_ROUNDING = RoundingMode.HALF_UP;

	private final MonthlyBudgetRepository monthlyBudgetRepository;
	private final BudgetGroupLimitRepository budgetGroupLimitRepository;
	private final ExpenseRepository expenseRepository;
	private final RecurringExpenseRepository recurringExpenseRepository;
	private final CurrentUser currentUser;

	public MonthlyBudgetService(
			MonthlyBudgetRepository monthlyBudgetRepository,
			BudgetGroupLimitRepository budgetGroupLimitRepository,
			ExpenseRepository expenseRepository,
			RecurringExpenseRepository recurringExpenseRepository,
			CurrentUser currentUser) {
		this.monthlyBudgetRepository = monthlyBudgetRepository;
		this.budgetGroupLimitRepository = budgetGroupLimitRepository;
		this.expenseRepository = expenseRepository;
		this.recurringExpenseRepository = recurringExpenseRepository;
		this.currentUser = currentUser;
	}

	/**
	 * Returns the monthly budget. Seeds preset group limits when none exist yet, and
	 * refreshes unlocked (auto-managed) budgets so totals stay in sync with schedules/spend.
	 */
	public MonthlyBudgetResponse getByYearAndMonth(Integer year, Integer month) {
		validatePeriod(year, month);
		Long userId = currentUser.requireUserId();
		MonthlyBudget budget = monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(userId, year, month)
			.orElseThrow(() -> new MonthlyBudgetNotFoundException(year, month));

		ensureGroupLimitsPresent(budget, userId);

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

		MonthlyBudget budget = new MonthlyBudget(
			currentUser.requireUserReference(),
			request.year(),
			request.month(),
			totalLimit,
			true
		);
		try {
			budget = monthlyBudgetRepository.saveAndFlush(budget);
		}
		catch (DataIntegrityViolationException ex) {
			throw new MonthlyBudgetAlreadyExistsException(request.year(), request.month());
		}
		seedPresetGroupLimits(budget, userId, Map.of());
		return toResponse(budget);
	}

	/**
	 * Creates or refreshes an auto-managed budget for the period. If the user has already
	 * edited the budget, returns it unchanged.
	 */
	public MonthlyBudgetResponse generateFromSchedules(MonthlyBudgetGenerateRequest request) {
		return ensureAutoBudget(request.year(), request.month());
	}

	/**
	 * Ensures an unlocked budget exists for the expense's month and refreshes group limits
	 * from presets, recurring bills, and actual spend. No-op when the budget is user-locked.
	 */
	public void syncAutoBudgetForDate(LocalDate expenseDate) {
		if (expenseDate == null) {
			return;
		}
		ensureAutoBudget(expenseDate.getYear(), expenseDate.getMonthValue());
	}

	/**
	 * Refreshes the current and next calendar month for unlocked auto budgets after
	 * recurring schedule changes.
	 */
	public void syncAutoBudgetsAround(LocalDate referenceDate) {
		LocalDate anchor = referenceDate == null ? LocalDate.now() : referenceDate;
		YearMonth current = YearMonth.from(anchor);
		ensureAutoBudget(current.getYear(), current.getMonthValue());
		YearMonth next = current.plusMonths(1);
		ensureAutoBudget(next.getYear(), next.getMonthValue());
	}

	public MonthlyBudgetResponse ensureAutoBudget(Integer year, Integer month) {
		validatePeriod(year, month);
		Long userId = currentUser.requireUserId();

		Optional<MonthlyBudget> existing = monthlyBudgetRepository
			.findByUser_IdAndBudgetYearAndBudgetMonth(userId, year, month);
		if (existing.isPresent()) {
			MonthlyBudget budget = existing.get();
			ensureGroupLimitsPresent(budget, userId);
			return toResponse(budget);
		}

		YearMonth yearMonth = YearMonth.of(year, month);
		Map<BudgetGroup, BigDecimal> computed = computeGroupTargets(userId, yearMonth);
		BigDecimal totalLimit = sumAmounts(new ArrayList<>(computed.values()));
		if (totalLimit.compareTo(BigDecimal.ZERO) <= 0) {
			totalLimit = sumPresetTotal();
		}

		MonthlyBudget budget = new MonthlyBudget(
			currentUser.requireUserReference(),
			year,
			month,
			totalLimit,
			false
		);
		try {
			budget = monthlyBudgetRepository.saveAndFlush(budget);
		}
		catch (DataIntegrityViolationException ex) {
			return monthlyBudgetRepository
				.findByUser_IdAndBudgetYearAndBudgetMonth(userId, year, month)
				.map(this::toResponse)
				.orElseThrow(() -> new MonthlyBudgetAlreadyExistsException(year, month));
		}

		seedPresetGroupLimits(budget, userId, computed);
		budget.setTotalLimit(sumGroupLimits(budget.getId()));
		monthlyBudgetRepository.saveAndFlush(budget);
		return toResponse(budget);
	}

	public MonthlyBudgetResponse update(Long id, MonthlyBudgetUpdateRequest request) {
		MonthlyBudget budget = getBudgetOrThrow(id, currentUser.requireUserId());
		budget.setTotalLimit(validateAmount(request.totalLimit(), "Total limit"));
		budget.setUserModified(true);
		return toResponse(monthlyBudgetRepository.saveAndFlush(budget));
	}

	public void delete(Long id) {
		MonthlyBudget budget = getBudgetOrThrow(id, currentUser.requireUserId());
		monthlyBudgetRepository.delete(budget);
	}

	public MonthlyBudgetResponse createGroupLimit(Long budgetId, BudgetGroupLimitCreateRequest request) {
		Long userId = currentUser.requireUserId();
		MonthlyBudget budget = getBudgetOrThrow(budgetId, userId);
		BudgetGroup group = BudgetGroup.requireParse(request.budgetGroup());
		BigDecimal limitAmount = validateAmount(request.limitAmount(), "Limit amount");
		BigDecimal assistanceAmount = validateAssistanceAmount(request.assistanceAmount());

		if (budgetGroupLimitRepository.existsByMonthlyBudget_IdAndBudgetGroupAndUser_Id(budgetId, group, userId)) {
			throw new BudgetGroupAlreadyExistsException(budgetId, group);
		}

		BudgetGroupLimit limit = new BudgetGroupLimit(
			currentUser.requireUserReference(),
			budget,
			group,
			limitAmount,
			assistanceAmount
		);
		try {
			budgetGroupLimitRepository.saveAndFlush(limit);
		}
		catch (DataIntegrityViolationException ex) {
			throw new BudgetGroupAlreadyExistsException(budgetId, group);
		}
		budget.setUserModified(true);
		budget.setTotalLimit(sumGroupLimits(budgetId).max(budget.getTotalLimit()));
		monthlyBudgetRepository.saveAndFlush(budget);
		return toResponse(budget);
	}

	public MonthlyBudgetResponse updateGroupLimit(
			Long budgetId,
			Long limitId,
			BudgetGroupLimitUpdateRequest request) {
		Long userId = currentUser.requireUserId();
		MonthlyBudget budget = getBudgetOrThrow(budgetId, userId);
		BudgetGroupLimit limit = budgetGroupLimitRepository
			.findByIdAndMonthlyBudget_IdAndUser_Id(limitId, budgetId, userId)
			.orElseThrow(() -> new BudgetGroupLimitNotFoundException(budgetId, limitId));
		limit.setLimitAmount(validateAmount(request.limitAmount(), "Limit amount"));
		limit.setAssistanceAmount(validateAssistanceAmount(request.assistanceAmount()));
		budgetGroupLimitRepository.saveAndFlush(limit);
		budget.setUserModified(true);
		budget.setTotalLimit(sumGroupLimits(budgetId).max(budget.getTotalLimit()));
		monthlyBudgetRepository.saveAndFlush(budget);
		return toResponse(budget);
	}

	public MonthlyBudgetResponse deleteGroupLimit(Long budgetId, Long limitId) {
		Long userId = currentUser.requireUserId();
		MonthlyBudget budget = getBudgetOrThrow(budgetId, userId);
		BudgetGroupLimit limit = budgetGroupLimitRepository
			.findByIdAndMonthlyBudget_IdAndUser_Id(limitId, budgetId, userId)
			.orElseThrow(() -> new BudgetGroupLimitNotFoundException(budgetId, limitId));
		budgetGroupLimitRepository.delete(limit);
		budgetGroupLimitRepository.flush();
		budget.setUserModified(true);
		BigDecimal groupSum = sumGroupLimits(budgetId);
		if (groupSum.compareTo(BigDecimal.ZERO) > 0) {
			budget.setTotalLimit(groupSum);
		}
		monthlyBudgetRepository.saveAndFlush(budget);
		return toResponse(budget);
	}

	/**
	 * Ensures all nine budget groups exist. Unlocked budgets refresh every group from
	 * schedules and spend; partial locked budgets are migration artifacts, so reset
	 * them to the default presets instead of preserving old category-limit rollups.
	 */
	private void ensureGroupLimitsPresent(MonthlyBudget budget, Long userId) {
		List<BudgetGroupLimit> existingLimits = budgetGroupLimitRepository
			.findByMonthlyBudget_IdOrderByIdAsc(budget.getId());
		int expectedGroupCount = BudgetGroup.values().length;

		if (existingLimits.isEmpty()) {
			YearMonth yearMonth = YearMonth.of(budget.getBudgetYear(), budget.getBudgetMonth());
			Map<BudgetGroup, BigDecimal> computed = computeGroupTargets(userId, yearMonth);
			seedPresetGroupLimits(budget, userId, computed);
			if (!budget.isUserModified()) {
				budget.setTotalLimit(sumGroupLimits(budget.getId()));
				monthlyBudgetRepository.saveAndFlush(budget);
			}
			return;
		}

		if (existingLimits.size() < expectedGroupCount
				|| (budget.isUserModified() && hasLimitBelowPreset(existingLimits))) {
			if (budget.isUserModified()) {
				resetGroupLimitsToPresets(budget);
			}
			else {
				refreshAutoLimits(budget, userId);
			}
			return;
		}

		if (!budget.isUserModified()) {
			refreshAutoLimits(budget, userId);
		}
	}

	private boolean hasLimitBelowPreset(List<BudgetGroupLimit> limits) {
		for (BudgetGroupLimit limit : limits) {
			if (limit.getLimitAmount().compareTo(limit.getBudgetGroup().getPresetAmount()) < 0) {
				return true;
			}
		}
		return false;
	}

	private void resetGroupLimitsToPresets(MonthlyBudget budget) {
		List<BudgetGroupLimit> existing = budgetGroupLimitRepository
			.findByMonthlyBudget_IdOrderByIdAsc(budget.getId());
		Map<BudgetGroup, BudgetGroupLimit> byGroup = new EnumMap<>(BudgetGroup.class);
		for (BudgetGroupLimit limit : existing) {
			byGroup.put(limit.getBudgetGroup(), limit);
		}

		for (BudgetGroup group : BudgetGroup.values()) {
			BigDecimal amount = group.getPresetAmount().setScale(2, RoundingMode.HALF_UP);
			BudgetGroupLimit limit = byGroup.get(group);
			if (limit == null) {
				budgetGroupLimitRepository.saveAndFlush(new BudgetGroupLimit(
					currentUser.requireUserReference(),
					budget,
					group,
					amount,
					BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
				));
			}
			else {
				limit.setLimitAmount(amount);
				limit.setAssistanceAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
				budgetGroupLimitRepository.saveAndFlush(limit);
			}
		}
		budget.setTotalLimit(sumGroupLimits(budget.getId()));
		monthlyBudgetRepository.saveAndFlush(budget);
	}

	private void refreshAutoLimits(MonthlyBudget budget, Long userId) {
		YearMonth yearMonth = YearMonth.of(budget.getBudgetYear(), budget.getBudgetMonth());
		Map<BudgetGroup, BigDecimal> computed = computeGroupTargets(userId, yearMonth);
		List<BudgetGroupLimit> existing = budgetGroupLimitRepository
			.findByMonthlyBudget_IdOrderByIdAsc(budget.getId());
		Map<BudgetGroup, BudgetGroupLimit> byGroup = new EnumMap<>(BudgetGroup.class);
		for (BudgetGroupLimit limit : existing) {
			byGroup.put(limit.getBudgetGroup(), limit);
		}

		for (BudgetGroup group : BudgetGroup.values()) {
			BigDecimal target = computed.getOrDefault(group, group.getPresetAmount())
				.setScale(2, RoundingMode.HALF_UP);
			BudgetGroupLimit limit = byGroup.get(group);
			if (limit == null) {
				budgetGroupLimitRepository.saveAndFlush(new BudgetGroupLimit(
					currentUser.requireUserReference(),
					budget,
					group,
					target,
					BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
				));
			}
			else {
				limit.setLimitAmount(target);
				budgetGroupLimitRepository.saveAndFlush(limit);
			}
		}

		budget.setTotalLimit(sumGroupLimits(budget.getId()));
		monthlyBudgetRepository.saveAndFlush(budget);
	}

	private void seedPresetGroupLimits(
			MonthlyBudget budget,
			Long userId,
			Map<BudgetGroup, BigDecimal> computed) {
		for (BudgetGroup group : BudgetGroup.values()) {
			BigDecimal amount = computed.getOrDefault(group, group.getPresetAmount())
				.setScale(2, RoundingMode.HALF_UP);
			if (amount.compareTo(BigDecimal.ZERO) <= 0) {
				amount = group.getPresetAmount();
			}
			budgetGroupLimitRepository.saveAndFlush(new BudgetGroupLimit(
				currentUser.requireUserReference(),
				budget,
				group,
				amount,
				BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
			));
		}
	}

	/**
	 * Per-group target = max(preset, recurring projection for the month, actual spend).
	 */
	private Map<BudgetGroup, BigDecimal> computeGroupTargets(Long userId, YearMonth yearMonth) {
		LocalDate monthStart = yearMonth.atDay(1);
		LocalDate monthEnd = yearMonth.atEndOfMonth();
		LocalDate endExclusive = monthStart.plusMonths(1);

		Map<BudgetGroup, BigDecimal> targets = new EnumMap<>(BudgetGroup.class);
		for (BudgetGroup group : BudgetGroup.values()) {
			targets.put(group, group.getPresetAmount());
		}

		List<RecurringExpense> expenseSchedules =
			recurringExpenseRepository.findActiveDueOnOrBefore(userId, monthEnd);
		for (RecurringExpense schedule : expenseSchedules) {
			BigDecimal amount = RecurringPeriodProjection.expenseAmountInPeriod(schedule, monthStart, monthEnd);
			if (amount.compareTo(BigDecimal.ZERO) <= 0) {
				continue;
			}
			BudgetGroup group = resolveGroup(schedule.getCategory());
			targets.merge(group, amount, (presetOrPrior, recurring) -> presetOrPrior.max(recurring));
		}

		List<Expense> expenses = expenseRepository
			.findByUser_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
				userId,
				monthStart,
				endExclusive
			);
		Map<BudgetGroup, BigDecimal> spentByGroup = new EnumMap<>(BudgetGroup.class);
		for (Expense expense : expenses) {
			BudgetGroup group = resolveGroup(expense.getCategory());
			spentByGroup.merge(group, expense.getAmount(), BigDecimal::add);
		}
		for (Map.Entry<BudgetGroup, BigDecimal> entry : spentByGroup.entrySet()) {
			targets.merge(entry.getKey(), entry.getValue(), BigDecimal::max);
		}

		for (Map.Entry<BudgetGroup, BigDecimal> entry : targets.entrySet()) {
			entry.setValue(entry.getValue().setScale(2, RoundingMode.HALF_UP));
		}
		return targets;
	}

	private BudgetGroup resolveGroup(Category category) {
		if (category == null) {
			return BudgetGroup.PERSONAL_HOUSEHOLD;
		}
		if (category.getBudgetGroup() != null) {
			return category.getBudgetGroup();
		}
		return BudgetGroup.fromCategoryName(category.getName());
	}

	private BigDecimal sumGroupLimits(Long budgetId) {
		List<BudgetGroupLimit> limits = budgetGroupLimitRepository.findByMonthlyBudget_IdOrderByIdAsc(budgetId);
		BigDecimal total = BigDecimal.ZERO;
		for (BudgetGroupLimit limit : limits) {
			total = total.add(limit.getLimitAmount());
		}
		return total.setScale(2, RoundingMode.HALF_UP);
	}

	private BigDecimal sumPresetTotal() {
		BigDecimal total = BigDecimal.ZERO;
		for (BudgetGroup group : BudgetGroup.values()) {
			total = total.add(group.getPresetAmount());
		}
		return total.setScale(2, RoundingMode.HALF_UP);
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

	private BigDecimal validateAssistanceAmount(BigDecimal amount) {
		if (amount == null) {
			return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
		}
		if (amount.compareTo(BigDecimal.ZERO) < 0) {
			throw new InvalidBudgetDataException("Assistance amount must be zero or greater");
		}
		if (amount.scale() > 2) {
			throw new InvalidBudgetDataException("Assistance amount must have at most 2 decimal places");
		}
		if (amount.compareTo(MAX_AMOUNT) > 0) {
			throw new InvalidBudgetDataException("Assistance amount must fit NUMERIC(12,2)");
		}
		return amount.setScale(2, RoundingMode.HALF_UP);
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

		Map<BudgetGroup, BigDecimal> spentByGroup = new EnumMap<>(BudgetGroup.class);
		for (Expense expense : expenses) {
			BudgetGroup group = resolveGroup(expense.getCategory());
			spentByGroup.merge(group, expense.getAmount(), BigDecimal::add);
		}

		List<BudgetGroupLimit> limits = budgetGroupLimitRepository
			.findByMonthlyBudget_IdOrderByIdAsc(budget.getId());

		BigDecimal assistanceApplied = BigDecimal.ZERO;
		List<BudgetGroupLimitResponse> groupLimitResponses = new ArrayList<>();
		for (BudgetGroupLimit limit : limits) {
			BudgetGroup group = limit.getBudgetGroup();
			BigDecimal limitAmount = limit.getLimitAmount();
			BigDecimal assistanceAmount = limit.getAssistanceAmount() == null
				? BigDecimal.ZERO
				: limit.getAssistanceAmount().setScale(2, RoundingMode.HALF_UP);
			BigDecimal actualSpent = spentByGroup
				.getOrDefault(group, BigDecimal.ZERO)
				.setScale(2, RoundingMode.HALF_UP);
			BigDecimal covered = actualSpent.min(assistanceAmount);
			BigDecimal budgetableSpent = actualSpent.subtract(covered).setScale(2, RoundingMode.HALF_UP);
			assistanceApplied = assistanceApplied.add(covered);
			BigDecimal groupRemaining = limitAmount.subtract(budgetableSpent).setScale(2, RoundingMode.HALF_UP);
			boolean groupOverBudget = budgetableSpent.compareTo(limitAmount) > 0;
			groupLimitResponses.add(new BudgetGroupLimitResponse(
				limit.getId(),
				BudgetGroupSummary.from(group),
				limitAmount,
				assistanceAmount,
				actualSpent,
				budgetableSpent,
				groupRemaining,
				percentUsed(budgetableSpent, limitAmount),
				groupOverBudget
			));
		}

		assistanceApplied = assistanceApplied.setScale(2, RoundingMode.HALF_UP);
		BigDecimal budgetableExpenses = actualExpenses.subtract(assistanceApplied).setScale(2, RoundingMode.HALF_UP);
		BigDecimal remaining = totalLimit.subtract(budgetableExpenses).setScale(2, RoundingMode.HALF_UP);
		boolean overBudget = budgetableExpenses.compareTo(totalLimit) > 0;
		BigDecimal percentUsed = percentUsed(budgetableExpenses, totalLimit);

		groupLimitResponses.sort(
			Comparator.comparing((BudgetGroupLimitResponse row) -> row.group().label(), String.CASE_INSENSITIVE_ORDER)
				.thenComparing(BudgetGroupLimitResponse::id)
		);

		return new MonthlyBudgetResponse(
			budget.getId(),
			budget.getBudgetYear(),
			budget.getBudgetMonth(),
			totalLimit,
			actualExpenses,
			budgetableExpenses,
			assistanceApplied,
			remaining,
			percentUsed,
			overBudget,
			budget.isUserModified(),
			expenses.size(),
			List.copyOf(groupLimitResponses),
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
		if (limit.compareTo(BigDecimal.ZERO) <= 0) {
			return BigDecimal.ZERO.setScale(PERCENT_SCALE, PERCENT_ROUNDING);
		}
		return actual
			.multiply(new BigDecimal("100"))
			.divide(limit, PERCENT_SCALE, PERCENT_ROUNDING);
	}
}
