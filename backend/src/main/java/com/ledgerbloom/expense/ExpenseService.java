package com.ledgerbloom.expense;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.budget.MonthlyBudgetService;
import com.ledgerbloom.category.Category;
import com.ledgerbloom.category.CategoryNotFoundException;
import com.ledgerbloom.category.CategoryRepository;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ExpenseService {

	private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");

	private final ExpenseRepository expenseRepository;
	private final CategoryRepository categoryRepository;
	private final MonthlyBudgetService monthlyBudgetService;
	private final CurrentUser currentUser;

	public ExpenseService(
			ExpenseRepository expenseRepository,
			CategoryRepository categoryRepository,
			MonthlyBudgetService monthlyBudgetService,
			CurrentUser currentUser) {
		this.expenseRepository = expenseRepository;
		this.categoryRepository = categoryRepository;
		this.monthlyBudgetService = monthlyBudgetService;
		this.currentUser = currentUser;
	}

	@Transactional(readOnly = true)
	public List<ExpenseResponse> findAll(Integer year, Integer month, Long categoryId) {
		validateFilter(year, month, categoryId);
		Long userId = currentUser.requireUserId();

		boolean hasMonth = year != null || month != null;
		boolean hasCategory = categoryId != null;

		List<Expense> expenses;
		if (hasMonth && hasCategory) {
			LocalDate start = YearMonth.of(year, month).atDay(1);
			LocalDate endExclusive = start.plusMonths(1);
			expenses = expenseRepository
				.findByUser_IdAndCategory_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
					userId,
					categoryId,
					start,
					endExclusive
				);
		}
		else if (hasMonth) {
			LocalDate start = YearMonth.of(year, month).atDay(1);
			LocalDate endExclusive = start.plusMonths(1);
			expenses = expenseRepository
				.findByUser_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
					userId,
					start,
					endExclusive
				);
		}
		else if (hasCategory) {
			expenses = expenseRepository.findByUser_IdAndCategory_IdOrderByExpenseDateDescIdDesc(userId, categoryId);
		}
		else {
			expenses = expenseRepository.findByUser_IdOrderByExpenseDateDescIdDesc(userId);
		}

		return expenses.stream().map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public ExpenseResponse findById(Long id) {
		return toResponse(getExpenseOrThrow(id, currentUser.requireUserId()));
	}

	public ExpenseResponse create(ExpenseCreateRequest request) {
		Long userId = currentUser.requireUserId();
		NormalizedExpenseData data = normalize(request.description(), request.merchant(), request.amount(),
			request.expenseDate(), request.categoryId(), request.notes());
		Category category = getCategoryOrThrow(data.categoryId(), userId);

		Expense expense = new Expense(
			currentUser.requireUserReference(),
			data.description(),
			data.merchant(),
			data.amount(),
			data.expenseDate(),
			data.notes(),
			category
		);
		ExpenseResponse response = toResponse(saveExpense(expense));
		monthlyBudgetService.syncAutoBudgetForDate(data.expenseDate());
		return response;
	}

	public ExpenseResponse update(Long id, ExpenseUpdateRequest request) {
		Long userId = currentUser.requireUserId();
		Expense expense = getExpenseOrThrow(id, userId);
		LocalDate previousDate = expense.getExpenseDate();
		NormalizedExpenseData data = normalize(request.description(), request.merchant(), request.amount(),
			request.expenseDate(), request.categoryId(), request.notes());
		Category category = getCategoryOrThrow(data.categoryId(), userId);

		expense.setDescription(data.description());
		expense.setMerchant(data.merchant());
		expense.setAmount(data.amount());
		expense.setExpenseDate(data.expenseDate());
		expense.setNotes(data.notes());
		expense.setCategory(category);
		ExpenseResponse response = toResponse(saveExpense(expense));
		monthlyBudgetService.syncAutoBudgetForDate(previousDate);
		monthlyBudgetService.syncAutoBudgetForDate(data.expenseDate());
		return response;
	}

	public void delete(Long id) {
		Expense expense = getExpenseOrThrow(id, currentUser.requireUserId());
		LocalDate expenseDate = expense.getExpenseDate();
		expenseRepository.delete(expense);
		monthlyBudgetService.syncAutoBudgetForDate(expenseDate);
	}

	private Expense saveExpense(Expense expense) {
		try {
			return expenseRepository.saveAndFlush(expense);
		}
		catch (DataIntegrityViolationException ex) {
			if (isForeignKeyViolation(ex)) {
				// Expense has one FK (category_id). SQLState 23503 indicates that constraint failed,
				// typically because the category was deleted after lookup but before flush.
				throw new CategoryNotFoundException(expense.getCategory().getId());
			}
			throw ex;
		}
	}

	/**
	 * Detects PostgreSQL foreign-key violations via JDBC SQLState 23503 without inspecting
	 * constraint names or database error text.
	 */
	private static boolean isForeignKeyViolation(DataIntegrityViolationException ex) {
		Throwable current = ex;
		while (current != null) {
			if (current instanceof SQLException sqlException && "23503".equals(sqlException.getSQLState())) {
				return true;
			}
			current = current.getCause();
		}
		return false;
	}

	private Expense getExpenseOrThrow(Long id, Long userId) {
		return expenseRepository.findByIdAndUser_Id(id, userId)
			.orElseThrow(() -> new ExpenseNotFoundException(id));
	}

	private Category getCategoryOrThrow(Long categoryId, Long userId) {
		return categoryRepository.findByIdAndUser_Id(categoryId, userId)
			.orElseThrow(() -> new CategoryNotFoundException(categoryId));
	}

	private void validateFilter(Integer year, Integer month, Long categoryId) {
		boolean yearPresent = year != null;
		boolean monthPresent = month != null;
		if (yearPresent != monthPresent) {
			throw new InvalidExpenseFilterException("year and month must both be provided together");
		}
		if (monthPresent) {
			if (month < 1 || month > 12) {
				throw new InvalidExpenseFilterException("month must be between 1 and 12");
			}
			if (year < 1 || year > 9999) {
				throw new InvalidExpenseFilterException("year must be a positive value between 1 and 9999");
			}
		}
		if (categoryId != null && categoryId <= 0) {
			throw new InvalidExpenseFilterException("categoryId must be positive");
		}
	}

	private NormalizedExpenseData normalize(
			String description,
			String merchant,
			BigDecimal amount,
			LocalDate expenseDate,
			Long categoryId,
			String notes) {
		String normalizedDescription = normalizeOptionalText(description, 160, "Description");
		String normalizedMerchant = normalizeOptionalText(merchant, 120, "Merchant");
		String normalizedNotes = normalizeOptionalText(notes, null, "Notes");
		validateAmount(amount);

		if (expenseDate == null) {
			throw new InvalidExpenseDataException("Expense date is required");
		}
		if (categoryId == null || categoryId <= 0) {
			throw new InvalidExpenseDataException("Category ID must be a positive value");
		}

		return new NormalizedExpenseData(
			normalizedDescription,
			normalizedMerchant,
			amount,
			expenseDate,
			categoryId,
			normalizedNotes
		);
	}

	private String normalizeOptionalText(String value, Integer maxLength, String fieldLabel) {
		if (value == null) {
			return null;
		}
		String normalized = value.trim();
		if (normalized.isBlank()) {
			return null;
		}
		if (maxLength != null && normalized.length() > maxLength) {
			throw new InvalidExpenseDataException(fieldLabel + " must be at most " + maxLength + " characters");
		}
		return normalized;
	}

	private void validateAmount(BigDecimal amount) {
		if (amount == null) {
			throw new InvalidExpenseDataException("Amount is required");
		}
		if (amount.compareTo(BigDecimal.ZERO) <= 0) {
			throw new InvalidExpenseDataException("Amount must be greater than zero");
		}
		if (amount.scale() > 2) {
			throw new InvalidExpenseDataException("Amount must have at most 2 decimal places");
		}
		if (amount.compareTo(MAX_AMOUNT) > 0) {
			throw new InvalidExpenseDataException("Amount must fit NUMERIC(12,2)");
		}
	}

	private ExpenseResponse toResponse(Expense expense) {
		Category category = expense.getCategory();
		return new ExpenseResponse(
			expense.getId(),
			expense.getDescription(),
			expense.getMerchant(),
			expense.getAmount(),
			expense.getExpenseDate(),
			new ExpenseCategorySummary(category.getId(), category.getName(), category.getColor()),
			expense.getNotes(),
			expense.getCreatedAt(),
			expense.getUpdatedAt()
		);
	}

	private record NormalizedExpenseData(
			String description,
			String merchant,
			BigDecimal amount,
			LocalDate expenseDate,
			Long categoryId,
			String notes
	) {
	}
}
