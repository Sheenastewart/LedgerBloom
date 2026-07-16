package com.ledgerbloom.recurring;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.category.Category;
import com.ledgerbloom.category.CategoryNotFoundException;
import com.ledgerbloom.category.CategoryRepository;
import com.ledgerbloom.expense.ExpenseCreateRequest;
import com.ledgerbloom.expense.ExpenseResponse;
import com.ledgerbloom.expense.ExpenseService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class RecurringExpenseService {

	private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");
	private static final int DEFAULT_UPCOMING_DAYS = 30;

	private final RecurringExpenseRepository recurringExpenseRepository;
	private final CategoryRepository categoryRepository;
	private final ExpenseService expenseService;
	private final CurrentUser currentUser;

	public RecurringExpenseService(
			RecurringExpenseRepository recurringExpenseRepository,
			CategoryRepository categoryRepository,
			ExpenseService expenseService,
			CurrentUser currentUser) {
		this.recurringExpenseRepository = recurringExpenseRepository;
		this.categoryRepository = categoryRepository;
		this.expenseService = expenseService;
		this.currentUser = currentUser;
	}

	@Transactional(readOnly = true)
	public List<RecurringExpenseResponse> findAll(Boolean active, Long categoryId, String cadence) {
		RecurringExpenseCadence cadenceEnum = parseCadenceFilter(cadence);
		validateCategoryFilter(categoryId);
		Long userId = currentUser.requireUserId();
		return recurringExpenseRepository.findFiltered(userId, active, categoryId, cadenceEnum).stream()
			.map(this::toResponse)
			.toList();
	}

	@Transactional(readOnly = true)
	public List<RecurringExpenseResponse> findUpcoming(Integer days) {
		int windowDays = days == null ? DEFAULT_UPCOMING_DAYS : days;
		if (windowDays < 1) {
			throw new InvalidRecurringExpenseFilterException("days must be a positive integer");
		}
		LocalDate today = LocalDate.now();
		LocalDate toInclusive = today.plusDays(windowDays);
		Long userId = currentUser.requireUserId();
		return recurringExpenseRepository.findUpcoming(userId, today, toInclusive).stream()
			.map(this::toResponse)
			.toList();
	}

	@Transactional(readOnly = true)
	public RecurringExpenseResponse findById(Long id) {
		return toResponse(getOrThrow(id, currentUser.requireUserId()));
	}

	public RecurringExpenseResponse create(RecurringExpenseCreateRequest request) {
		Long userId = currentUser.requireUserId();
		NormalizedData data = normalize(
			request.description(),
			request.merchant(),
			request.amount(),
			request.categoryId(),
			request.cadence(),
			request.nextPaymentDate(),
			request.active(),
			request.notes()
		);
		Category category = getCategoryOrThrow(data.categoryId(), userId);
		RecurringExpense entity = new RecurringExpense(
			currentUser.requireUserReference(),
			data.description(),
			data.merchant(),
			data.amount(),
			category,
			data.cadence(),
			data.nextPaymentDate(),
			data.active(),
			data.notes()
		);
		return toResponse(recurringExpenseRepository.saveAndFlush(entity));
	}

	public RecurringExpenseResponse update(Long id, RecurringExpenseUpdateRequest request) {
		Long userId = currentUser.requireUserId();
		RecurringExpense entity = getOrThrow(id, userId);
		NormalizedData data = normalize(
			request.description(),
			request.merchant(),
			request.amount(),
			request.categoryId(),
			request.cadence(),
			request.nextPaymentDate(),
			request.active(),
			request.notes()
		);
		Category category = getCategoryOrThrow(data.categoryId(), userId);
		entity.setDescription(data.description());
		entity.setMerchant(data.merchant());
		entity.setAmount(data.amount());
		entity.setCategory(category);
		entity.setCadence(data.cadence());
		entity.setNextPaymentDate(data.nextPaymentDate());
		entity.setActive(data.active());
		entity.setNotes(data.notes());
		return toResponse(recurringExpenseRepository.saveAndFlush(entity));
	}

	public void delete(Long id) {
		RecurringExpense entity = getOrThrow(id, currentUser.requireUserId());
		recurringExpenseRepository.delete(entity);
	}

	/**
	 * Marks a recurring item paid inside one transaction:
	 * pessimistic row lock → required expectedNextPaymentDate match → create Expense → advance next date.
	 * expectedNextPaymentDate is required so a second serialized request with a stale date is rejected
	 * (row lock alone would otherwise allow another Expense after the date advanced).
	 */
	public MarkPaidResponse markPaid(Long id, MarkPaidRequest request) {
		Long userId = currentUser.requireUserId();
		RecurringExpense entity = recurringExpenseRepository.findByIdAndUser_IdForUpdate(id, userId)
			.orElseThrow(() -> new RecurringExpenseNotFoundException(id));

		LocalDate expected = request.expectedNextPaymentDate();
		if (!expected.equals(entity.getNextPaymentDate())) {
			throw new RecurringExpensePaymentConflictException(
				"Recurring expense was already updated; refresh and try again"
			);
		}

		LocalDate paymentDate = entity.getNextPaymentDate();
		String paymentNote = buildMarkPaidNote(entity);

		ExpenseResponse createdExpense = expenseService.create(new ExpenseCreateRequest(
			entity.getDescription(),
			entity.getMerchant(),
			entity.getAmount(),
			paymentDate,
			entity.getCategory().getId(),
			paymentNote
		));

		entity.setNextPaymentDate(advanceNextPaymentDate(paymentDate, entity.getCadence()));
		RecurringExpenseResponse updated = toResponse(recurringExpenseRepository.saveAndFlush(entity));
		return new MarkPaidResponse(createdExpense, updated);
	}

	static LocalDate advanceNextPaymentDate(LocalDate from, RecurringExpenseCadence cadence) {
		return switch (cadence) {
			case WEEKLY -> from.plusWeeks(1);
			case BIWEEKLY -> from.plusWeeks(2);
			case MONTHLY -> from.plusMonths(1);
			case QUARTERLY -> from.plusMonths(3);
			case SEMIANNUAL -> from.plusMonths(6);
			case ANNUAL -> from.plusYears(1);
		};
	}

	private String buildMarkPaidNote(RecurringExpense entity) {
		String source = "Paid from recurring expense #" + entity.getId();
		if (entity.getNotes() == null || entity.getNotes().isBlank()) {
			return source;
		}
		return source + ". " + entity.getNotes();
	}

	private RecurringExpense getOrThrow(Long id, Long userId) {
		return recurringExpenseRepository.findByIdAndUser_Id(id, userId)
			.orElseThrow(() -> new RecurringExpenseNotFoundException(id));
	}

	private Category getCategoryOrThrow(Long categoryId, Long userId) {
		return categoryRepository.findByIdAndUser_Id(categoryId, userId)
			.orElseThrow(() -> new CategoryNotFoundException(categoryId));
	}

	private void validateCategoryFilter(Long categoryId) {
		if (categoryId != null && categoryId <= 0) {
			throw new InvalidRecurringExpenseFilterException("categoryId must be positive");
		}
	}

	private RecurringExpenseCadence parseCadenceFilter(String cadence) {
		if (cadence == null || cadence.isBlank()) {
			return null;
		}
		try {
			return RecurringExpenseCadence.valueOf(cadence.trim().toUpperCase());
		}
		catch (IllegalArgumentException ex) {
			throw new InvalidRecurringExpenseFilterException("cadence must be a supported value");
		}
	}

	private NormalizedData normalize(
			String description,
			String merchant,
			BigDecimal amount,
			Long categoryId,
			RecurringExpenseCadence cadence,
			LocalDate nextPaymentDate,
			Boolean active,
			String notes) {
		String normalizedDescription = description == null ? "" : description.trim();
		if (normalizedDescription.isBlank()) {
			throw new InvalidRecurringExpenseDataException("Description is required");
		}
		if (normalizedDescription.length() > 160) {
			throw new InvalidRecurringExpenseDataException("Description must be at most 160 characters");
		}

		String normalizedMerchant = normalizeOptional(merchant, 120, "Merchant");
		String normalizedNotes = normalizeOptional(notes, null, "Notes");
		validateAmount(amount);

		if (categoryId == null || categoryId <= 0) {
			throw new InvalidRecurringExpenseDataException("Category ID must be positive");
		}
		if (cadence == null) {
			throw new InvalidRecurringExpenseDataException("Cadence is required");
		}
		if (nextPaymentDate == null) {
			throw new InvalidRecurringExpenseDataException("Next payment date is required");
		}
		if (active == null) {
			throw new InvalidRecurringExpenseDataException("Active is required");
		}

		return new NormalizedData(
			normalizedDescription,
			normalizedMerchant,
			amount,
			categoryId,
			cadence,
			nextPaymentDate,
			active,
			normalizedNotes
		);
	}

	private String normalizeOptional(String value, Integer maxLength, String label) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		if (trimmed.isBlank()) {
			return null;
		}
		if (maxLength != null && trimmed.length() > maxLength) {
			throw new InvalidRecurringExpenseDataException(label + " must be at most " + maxLength + " characters");
		}
		return trimmed;
	}

	private void validateAmount(BigDecimal amount) {
		if (amount == null) {
			throw new InvalidRecurringExpenseDataException("Amount is required");
		}
		if (amount.compareTo(BigDecimal.ZERO) <= 0) {
			throw new InvalidRecurringExpenseDataException("Amount must be greater than zero");
		}
		if (amount.scale() > 2) {
			throw new InvalidRecurringExpenseDataException("Amount must have at most 2 decimal places");
		}
		if (amount.compareTo(MAX_AMOUNT) > 0) {
			throw new InvalidRecurringExpenseDataException("Amount must fit NUMERIC(12,2)");
		}
	}

	private RecurringExpenseResponse toResponse(RecurringExpense entity) {
		return new RecurringExpenseResponse(
			entity.getId(),
			entity.getDescription(),
			entity.getMerchant(),
			entity.getAmount(),
			new RecurringExpenseCategorySummary(entity.getCategory().getId(), entity.getCategory().getName()),
			entity.getCadence(),
			entity.getNextPaymentDate(),
			entity.isActive(),
			entity.getNotes(),
			entity.getCreatedAt(),
			entity.getUpdatedAt()
		);
	}

	private record NormalizedData(
			String description,
			String merchant,
			BigDecimal amount,
			Long categoryId,
			RecurringExpenseCadence cadence,
			LocalDate nextPaymentDate,
			boolean active,
			String notes
	) {
	}
}
