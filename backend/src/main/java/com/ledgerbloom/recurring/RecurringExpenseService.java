package com.ledgerbloom.recurring;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.category.Category;
import com.ledgerbloom.category.CategoryNotFoundException;
import com.ledgerbloom.category.CategoryRepository;
import com.ledgerbloom.expense.Expense;
import com.ledgerbloom.expense.ExpenseCreateRequest;
import com.ledgerbloom.expense.ExpenseRepository;
import com.ledgerbloom.expense.ExpenseResponse;
import com.ledgerbloom.expense.ExpenseService;
import com.ledgerbloom.recurring.support.CadenceKind;
import com.ledgerbloom.recurring.support.CadenceScheduleMath;
import com.ledgerbloom.recurring.support.CatchUpRequest;
import com.ledgerbloom.recurring.support.HistorySetupMode;
import com.ledgerbloom.recurring.support.OccurrencePreviewItem;
import com.ledgerbloom.recurring.support.OccurrencePreviewRequest;
import com.ledgerbloom.recurring.support.OccurrencePreviewResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class RecurringExpenseService {

	private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");
	private static final int DEFAULT_UPCOMING_DAYS = 30;

	private final RecurringExpenseRepository recurringExpenseRepository;
	private final RecurringExpenseOccurrenceRecordRepository occurrenceRecordRepository;
	private final CategoryRepository categoryRepository;
	private final ExpenseService expenseService;
	private final ExpenseRepository expenseRepository;
	private final CurrentUser currentUser;

	public RecurringExpenseService(
			RecurringExpenseRepository recurringExpenseRepository,
			RecurringExpenseOccurrenceRecordRepository occurrenceRecordRepository,
			CategoryRepository categoryRepository,
			ExpenseService expenseService,
			ExpenseRepository expenseRepository,
			CurrentUser currentUser) {
		this.recurringExpenseRepository = recurringExpenseRepository;
		this.occurrenceRecordRepository = occurrenceRecordRepository;
		this.categoryRepository = categoryRepository;
		this.expenseService = expenseService;
		this.expenseRepository = expenseRepository;
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

	/**
	 * Previews cadence occurrences from {@code startDate} through today (pure calculation,
	 * no persistence) so callers can decide between {@link HistorySetupMode#TRACK_FROM_NOW}
	 * and {@link HistorySetupMode#RECORD_SELECTED} before creating a schedule.
	 */
	@Transactional(readOnly = true)
	public OccurrencePreviewResponse previewOccurrences(OccurrencePreviewRequest request) {
		validateAmount(request.amount());
		validatePreviewDays(request.cadence(), request.firstPaymentDay(), request.secondPaymentDay());
		if (request.startDate() == null) {
			throw new InvalidRecurringExpenseDataException("Start date is required");
		}

		LocalDate today = LocalDate.now();
		LocalDate start = request.startDate();
		BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);

		if (start.isAfter(today)) {
			return new OccurrencePreviewResponse(List.of(), start);
		}

		List<LocalDate> dates = CadenceScheduleMath.occurrencesThrough(
			start, today, request.cadence(), request.firstPaymentDay(), request.secondPaymentDay());
		LocalDate suggestedNext = CadenceScheduleMath.firstOnOrAfter(
			start, today, request.cadence(), request.firstPaymentDay(), request.secondPaymentDay());
		List<OccurrencePreviewItem> items = dates.stream()
			.map(date -> new OccurrencePreviewItem(date, amount))
			.toList();
		return new OccurrencePreviewResponse(items, suggestedNext);
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
			request.notes(),
			request.firstPaymentDay(),
			request.secondPaymentDay()
		);
		Category category = getCategoryOrThrow(data.categoryId(), userId);

		LocalDate today = LocalDate.now();
		CadenceKind cadenceKind = CadenceKind.fromExpense(data.cadence());
		LocalDate effectiveNext = data.nextPaymentDate();
		List<LocalDate> selectedDates = List.of();

		if (!data.nextPaymentDate().isAfter(today)) {
			HistorySetupMode historyMode = request.historyMode() == null
				? HistorySetupMode.TRACK_FROM_NOW
				: request.historyMode();
			List<LocalDate> preview = CadenceScheduleMath.occurrencesThrough(
				data.nextPaymentDate(), today, cadenceKind, data.firstPaymentDay(), data.secondPaymentDay());
			LocalDate lastPreviewDate = preview.get(preview.size() - 1);

			if (historyMode == HistorySetupMode.TRACK_FROM_NOW) {
				effectiveNext = CadenceScheduleMath.firstOnOrAfter(
					data.nextPaymentDate(), today, cadenceKind, data.firstPaymentDay(), data.secondPaymentDay());
			}
			else {
				List<LocalDate> requestedSelected = request.selectedOccurrenceDates() == null
					? List.of()
					: request.selectedOccurrenceDates();
				validateSelectedSubset(requestedSelected, preview);
				selectedDates = preview.stream().filter(requestedSelected::contains).toList();
				effectiveNext = CadenceScheduleMath.advance(
					lastPreviewDate, cadenceKind, data.firstPaymentDay(), data.secondPaymentDay());
			}
		}

		RecurringExpense entity = new RecurringExpense(
			currentUser.requireUserReference(),
			data.description(),
			data.merchant(),
			data.amount(),
			category,
			data.cadence(),
			effectiveNext,
			data.active(),
			data.notes(),
			data.firstPaymentDay(),
			data.secondPaymentDay()
		);
		RecurringExpense saved = recurringExpenseRepository.saveAndFlush(entity);

		for (LocalDate date : selectedDates) {
			recordHistoricalOccurrence(saved, date);
		}

		return toResponse(saved);
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
			request.notes(),
			request.firstPaymentDay(),
			request.secondPaymentDay()
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
		entity.setFirstPaymentDay(data.firstPaymentDay());
		entity.setSecondPaymentDay(data.secondPaymentDay());
		return toResponse(recurringExpenseRepository.saveAndFlush(entity));
	}

	public void delete(Long id) {
		RecurringExpense entity = getOrThrow(id, currentUser.requireUserId());
		recurringExpenseRepository.delete(entity);
	}

	/**
	 * Marks a recurring item paid inside one transaction:
	 * pessimistic row lock → required expectedNextPaymentDate match → occurrence record
	 * conflict check → create Expense → link occurrence record → advance next date.
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
		if (occurrenceRecordRepository.existsByRecurringExpense_IdAndOccurrenceDate(id, paymentDate)) {
			throw new RecurringExpensePaymentConflictException(
				"An occurrence record already exists for " + paymentDate + "; refresh and try again"
			);
		}

		String paymentNote = buildMarkPaidNote(entity);

		ExpenseResponse createdExpense = expenseService.create(new ExpenseCreateRequest(
			entity.getDescription(),
			entity.getMerchant(),
			entity.getAmount(),
			paymentDate,
			entity.getCategory().getId(),
			paymentNote
		));
		linkOccurrenceRecord(entity, paymentDate, createdExpense.id());

		entity.setNextPaymentDate(advanceNextPaymentDate(
			paymentDate, entity.getCadence(), entity.getFirstPaymentDay(), entity.getSecondPaymentDay()));
		RecurringExpenseResponse updated = toResponse(recurringExpenseRepository.saveAndFlush(entity));
		return new MarkPaidResponse(createdExpense, updated);
	}

	/**
	 * Records ledger entries for caller-selected overdue occurrence dates on an existing
	 * schedule. Locks the row, restricts newly requested dates to the pending window
	 * (current nextPaymentDate through today), skips dates that already have occurrence
	 * records (idempotent retries), and advances nextPaymentDate past every allowed date
	 * when that pending window is non-empty.
	 */
	public RecurringExpenseCatchUpResponse catchUp(Long id, CatchUpRequest request) {
		Long userId = currentUser.requireUserId();
		RecurringExpense entity = recurringExpenseRepository.findByIdAndUser_IdForUpdate(id, userId)
			.orElseThrow(() -> new RecurringExpenseNotFoundException(id));

		List<LocalDate> requestedDates = request.occurrenceDates();
		if (requestedDates == null || requestedDates.isEmpty()) {
			throw new InvalidRecurringExpenseDataException("occurrenceDates must include at least one date");
		}

		LocalDate today = LocalDate.now();
		CadenceKind cadenceKind = CadenceKind.fromExpense(entity.getCadence());
		List<LocalDate> allowedDates = CadenceScheduleMath.occurrencesThrough(
			entity.getNextPaymentDate(), today, cadenceKind, entity.getFirstPaymentDay(), entity.getSecondPaymentDay());
		Set<LocalDate> allowedSet = new HashSet<>(allowedDates);

		List<LocalDate> sortedRequested = requestedDates.stream().distinct().sorted().toList();
		List<LocalDate> pendingRequested = new ArrayList<>();
		for (LocalDate date : sortedRequested) {
			if (!occurrenceRecordRepository.existsByRecurringExpense_IdAndOccurrenceDate(id, date)) {
				pendingRequested.add(date);
			}
		}
		for (LocalDate date : pendingRequested) {
			if (!allowedSet.contains(date)) {
				throw new InvalidRecurringExpenseDataException(
					"occurrenceDates must be a subset of the pending occurrences on or before today"
				);
			}
		}

		List<LocalDate> createdDates = new ArrayList<>();
		List<ExpenseResponse> createdExpenses = new ArrayList<>();
		for (LocalDate date : pendingRequested) {
			ExpenseResponse createdExpense = expenseService.create(new ExpenseCreateRequest(
				entity.getDescription(),
				entity.getMerchant(),
				entity.getAmount(),
				date,
				entity.getCategory().getId(),
				buildCatchUpNote(entity)
			));
			if (tryLinkOccurrenceRecord(entity, date, createdExpense.id())) {
				createdDates.add(date);
				createdExpenses.add(createdExpense);
			}
		}

		LocalDate nextDate = entity.getNextPaymentDate();
		if (!allowedDates.isEmpty()) {
			LocalDate lastAllowed = allowedDates.get(allowedDates.size() - 1);
			nextDate = CadenceScheduleMath.advance(
				lastAllowed, cadenceKind, entity.getFirstPaymentDay(), entity.getSecondPaymentDay());
			entity.setNextPaymentDate(nextDate);
		}
		RecurringExpenseResponse updated = toResponse(recurringExpenseRepository.saveAndFlush(entity));

		return new RecurringExpenseCatchUpResponse(createdDates.size(), createdDates, nextDate, updated, createdExpenses);
	}

	public static LocalDate advanceNextPaymentDate(
			LocalDate from,
			RecurringExpenseCadence cadence,
			Integer firstPaymentDay,
			Integer secondPaymentDay) {
		return CadenceScheduleMath.advance(from, CadenceKind.fromExpense(cadence), firstPaymentDay, secondPaymentDay);
	}

	private void recordHistoricalOccurrence(RecurringExpense entity, LocalDate date) {
		ExpenseResponse created = expenseService.create(new ExpenseCreateRequest(
			entity.getDescription(),
			entity.getMerchant(),
			entity.getAmount(),
			date,
			entity.getCategory().getId(),
			buildHistoricalNote(entity)
		));
		linkOccurrenceRecord(entity, date, created.id());
	}

	private void linkOccurrenceRecord(RecurringExpense entity, LocalDate date, Long expenseId) {
		Expense reference = expenseRepository.getReferenceById(expenseId);
		occurrenceRecordRepository.saveAndFlush(new RecurringExpenseOccurrenceRecord(entity, date, reference));
	}

	/**
	 * Same as {@link #linkOccurrenceRecord} but swallows a unique-constraint race as an
	 * idempotent "already recorded" outcome instead of failing the whole catch-up request.
	 */
	private boolean tryLinkOccurrenceRecord(RecurringExpense entity, LocalDate date, Long expenseId) {
		try {
			linkOccurrenceRecord(entity, date, expenseId);
			return true;
		}
		catch (DataIntegrityViolationException ex) {
			return false;
		}
	}

	private void validateSelectedSubset(List<LocalDate> requestedSelected, List<LocalDate> preview) {
		Set<LocalDate> previewSet = new HashSet<>(preview);
		for (LocalDate date : requestedSelected) {
			if (!previewSet.contains(date)) {
				throw new InvalidRecurringExpenseDataException(
					"selectedOccurrenceDates must be a subset of the previewed occurrences"
				);
			}
		}
	}

	private String buildMarkPaidNote(RecurringExpense entity) {
		String source = "Paid from recurring expense #" + entity.getId();
		if (entity.getNotes() == null || entity.getNotes().isBlank()) {
			return source;
		}
		return source + ". " + entity.getNotes();
	}

	private String buildCatchUpNote(RecurringExpense entity) {
		return "Caught up from recurring expense #" + entity.getId();
	}

	private String buildHistoricalNote(RecurringExpense entity) {
		return "Recorded during setup of recurring expense #" + entity.getId();
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
			String notes,
			Integer firstPaymentDay,
			Integer secondPaymentDay) {
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

		NormalizedDays days = normalizePaymentDays(cadence, firstPaymentDay, secondPaymentDay);

		return new NormalizedData(
			normalizedDescription,
			normalizedMerchant,
			amount,
			categoryId,
			cadence,
			nextPaymentDate,
			active,
			normalizedNotes,
			days.first(),
			days.second()
		);
	}

	private NormalizedDays normalizePaymentDays(
			RecurringExpenseCadence cadence,
			Integer firstPaymentDay,
			Integer secondPaymentDay) {
		if (cadence != RecurringExpenseCadence.SEMIMONTHLY) {
			if (firstPaymentDay != null || secondPaymentDay != null) {
				throw new InvalidRecurringExpenseDataException(
					"firstPaymentDay and secondPaymentDay must be empty unless cadence is SEMIMONTHLY"
				);
			}
			return new NormalizedDays(null, null);
		}
		if (firstPaymentDay == null || secondPaymentDay == null) {
			throw new InvalidRecurringExpenseDataException(
				"firstPaymentDay and secondPaymentDay are required for SEMIMONTHLY cadence"
			);
		}
		if (firstPaymentDay < 1 || firstPaymentDay > 31 || secondPaymentDay < 1 || secondPaymentDay > 31) {
			throw new InvalidRecurringExpenseDataException(
				"firstPaymentDay and secondPaymentDay must be between 1 and 31"
			);
		}
		if (firstPaymentDay.equals(secondPaymentDay)) {
			throw new InvalidRecurringExpenseDataException("firstPaymentDay and secondPaymentDay must be different");
		}
		int[] sorted = CadenceScheduleMath.sortedPaymentDays(firstPaymentDay, secondPaymentDay);
		return new NormalizedDays(sorted[0], sorted[1]);
	}

	private void validatePreviewDays(CadenceKind cadence, Integer firstPaymentDay, Integer secondPaymentDay) {
		if (cadence == null) {
			throw new InvalidRecurringExpenseDataException("Cadence is required");
		}
		if (cadence != CadenceKind.SEMIMONTHLY) {
			if (firstPaymentDay != null || secondPaymentDay != null) {
				throw new InvalidRecurringExpenseDataException(
					"firstPaymentDay and secondPaymentDay must be empty unless cadence is SEMIMONTHLY"
				);
			}
			return;
		}
		if (firstPaymentDay == null || secondPaymentDay == null) {
			throw new InvalidRecurringExpenseDataException(
				"firstPaymentDay and secondPaymentDay are required for SEMIMONTHLY cadence"
			);
		}
		if (firstPaymentDay < 1 || firstPaymentDay > 31 || secondPaymentDay < 1 || secondPaymentDay > 31) {
			throw new InvalidRecurringExpenseDataException(
				"firstPaymentDay and secondPaymentDay must be between 1 and 31"
			);
		}
		if (firstPaymentDay.equals(secondPaymentDay)) {
			throw new InvalidRecurringExpenseDataException("firstPaymentDay and secondPaymentDay must be different");
		}
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
			entity.getUpdatedAt(),
			entity.getFirstPaymentDay(),
			entity.getSecondPaymentDay()
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
			String notes,
			Integer firstPaymentDay,
			Integer secondPaymentDay
	) {
	}

	private record NormalizedDays(Integer first, Integer second) {
	}
}
