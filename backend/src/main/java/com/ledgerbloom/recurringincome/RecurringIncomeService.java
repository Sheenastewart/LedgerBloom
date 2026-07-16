package com.ledgerbloom.recurringincome;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.income.IncomeEntryCreateRequest;
import com.ledgerbloom.income.IncomeEntryResponse;
import com.ledgerbloom.income.IncomeEntryService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class RecurringIncomeService {

	private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");
	private static final int DEFAULT_UPCOMING_DAYS = 30;

	private final RecurringIncomeRepository recurringIncomeRepository;
	private final IncomeEntryService incomeEntryService;
	private final CurrentUser currentUser;

	public RecurringIncomeService(
			RecurringIncomeRepository recurringIncomeRepository,
			IncomeEntryService incomeEntryService,
			CurrentUser currentUser) {
		this.recurringIncomeRepository = recurringIncomeRepository;
		this.incomeEntryService = incomeEntryService;
		this.currentUser = currentUser;
	}

	@Transactional(readOnly = true)
	public List<RecurringIncomeResponse> findAll(Boolean active, String cadence, String source) {
		RecurringIncomeCadence cadenceEnum = parseCadenceFilter(cadence);
		String normalizedSource = normalizeSourceFilter(source);
		boolean filterBySource = normalizedSource != null;
		// Never bind a null String into LOWER(:source) — PostgreSQL types that parameter as
		// bytea and fails with "function lower(bytea) does not exist". Pass a typed empty
		// string when the source filter is inactive, and compare against a Java-lowercased value.
		String sourceParam = filterBySource ? normalizedSource.toLowerCase(Locale.ROOT) : "";
		Long userId = currentUser.requireUserId();
		return recurringIncomeRepository
			.findFiltered(userId, active, cadenceEnum, filterBySource, sourceParam)
			.stream()
			.map(this::toResponse)
			.toList();
	}

	@Transactional(readOnly = true)
	public List<RecurringIncomeResponse> findUpcoming(Integer days) {
		int windowDays = days == null ? DEFAULT_UPCOMING_DAYS : days;
		if (windowDays < 1) {
			throw new InvalidRecurringIncomeFilterException("days must be a positive integer");
		}
		LocalDate today = LocalDate.now();
		LocalDate toInclusive = today.plusDays(windowDays);
		Long userId = currentUser.requireUserId();
		return recurringIncomeRepository.findUpcoming(userId, today, toInclusive).stream()
			.map(this::toResponse)
			.toList();
	}

	@Transactional(readOnly = true)
	public RecurringIncomeResponse findById(Long id) {
		return toResponse(getOrThrow(id, currentUser.requireUserId()));
	}

	public RecurringIncomeResponse create(RecurringIncomeCreateRequest request) {
		NormalizedData data = normalize(
			request.description(),
			request.source(),
			request.amount(),
			request.cadence(),
			request.nextIncomeDate(),
			request.active(),
			request.notes()
		);
		RecurringIncome entity = new RecurringIncome(
			currentUser.requireUserReference(),
			data.description(),
			data.source(),
			data.amount(),
			data.cadence(),
			data.nextIncomeDate(),
			data.active(),
			data.notes()
		);
		return toResponse(recurringIncomeRepository.saveAndFlush(entity));
	}

	public RecurringIncomeResponse update(Long id, RecurringIncomeUpdateRequest request) {
		RecurringIncome entity = getOrThrow(id, currentUser.requireUserId());
		NormalizedData data = normalize(
			request.description(),
			request.source(),
			request.amount(),
			request.cadence(),
			request.nextIncomeDate(),
			request.active(),
			request.notes()
		);
		entity.setDescription(data.description());
		entity.setSource(data.source());
		entity.setAmount(data.amount());
		entity.setCadence(data.cadence());
		entity.setNextIncomeDate(data.nextIncomeDate());
		entity.setActive(data.active());
		entity.setNotes(data.notes());
		return toResponse(recurringIncomeRepository.saveAndFlush(entity));
	}

	public void delete(Long id) {
		RecurringIncome entity = getOrThrow(id, currentUser.requireUserId());
		recurringIncomeRepository.delete(entity);
	}

	/**
	 * Marks a recurring item received inside one transaction:
	 * pessimistic row lock → required expectedNextIncomeDate match → create IncomeEntry → advance next date.
	 * expectedNextIncomeDate is required so a second serialized request with a stale date is rejected
	 * (row lock alone would otherwise allow another IncomeEntry after the date advanced).
	 */
	public MarkReceivedResponse markReceived(Long id, MarkReceivedRequest request) {
		Long userId = currentUser.requireUserId();
		RecurringIncome entity = recurringIncomeRepository.findByIdAndUser_IdForUpdate(id, userId)
			.orElseThrow(() -> new RecurringIncomeNotFoundException(id));

		LocalDate expected = request.expectedNextIncomeDate();
		if (!expected.equals(entity.getNextIncomeDate())) {
			throw new RecurringIncomeReceiptConflictException(
				"Recurring income was already updated; refresh and try again"
			);
		}

		LocalDate incomeDate = entity.getNextIncomeDate();
		String receiptNote = buildMarkReceivedNote(entity);

		IncomeEntryResponse createdIncomeEntry = incomeEntryService.create(new IncomeEntryCreateRequest(
			entity.getDescription(),
			entity.getSource(),
			entity.getAmount(),
			incomeDate,
			receiptNote
		));

		entity.setNextIncomeDate(advanceNextIncomeDate(incomeDate, entity.getCadence()));
		RecurringIncomeResponse updated = toResponse(recurringIncomeRepository.saveAndFlush(entity));
		return new MarkReceivedResponse(createdIncomeEntry, updated);
	}

	public static LocalDate advanceNextIncomeDate(LocalDate from, RecurringIncomeCadence cadence) {
		return switch (cadence) {
			case WEEKLY -> from.plusWeeks(1);
			case BIWEEKLY -> from.plusWeeks(2);
			case MONTHLY -> from.plusMonths(1);
			case QUARTERLY -> from.plusMonths(3);
			case SEMIANNUAL -> from.plusMonths(6);
			case ANNUAL -> from.plusYears(1);
		};
	}

	private String buildMarkReceivedNote(RecurringIncome entity) {
		String source = "Received from recurring income #" + entity.getId();
		if (entity.getNotes() == null || entity.getNotes().isBlank()) {
			return source;
		}
		return source + ". " + entity.getNotes();
	}

	private RecurringIncome getOrThrow(Long id, Long userId) {
		return recurringIncomeRepository.findByIdAndUser_Id(id, userId)
			.orElseThrow(() -> new RecurringIncomeNotFoundException(id));
	}

	private String normalizeSourceFilter(String source) {
		if (source == null) {
			return null;
		}
		String trimmed = source.trim();
		return trimmed.isBlank() ? null : trimmed;
	}

	private RecurringIncomeCadence parseCadenceFilter(String cadence) {
		if (cadence == null || cadence.isBlank()) {
			return null;
		}
		try {
			return RecurringIncomeCadence.valueOf(cadence.trim().toUpperCase());
		}
		catch (IllegalArgumentException ex) {
			throw new InvalidRecurringIncomeFilterException("cadence must be a supported value");
		}
	}

	private NormalizedData normalize(
			String description,
			String source,
			BigDecimal amount,
			RecurringIncomeCadence cadence,
			LocalDate nextIncomeDate,
			Boolean active,
			String notes) {
		String normalizedDescription = description == null ? "" : description.trim();
		if (normalizedDescription.isBlank()) {
			throw new InvalidRecurringIncomeDataException("Description is required");
		}
		if (normalizedDescription.length() > 160) {
			throw new InvalidRecurringIncomeDataException("Description must be at most 160 characters");
		}

		String normalizedSource = source == null ? "" : source.trim();
		if (normalizedSource.isBlank()) {
			throw new InvalidRecurringIncomeDataException("Source is required");
		}
		if (normalizedSource.length() > 120) {
			throw new InvalidRecurringIncomeDataException("Source must be at most 120 characters");
		}

		String normalizedNotes = normalizeOptional(notes, null, "Notes");
		validateAmount(amount);

		if (cadence == null) {
			throw new InvalidRecurringIncomeDataException("Cadence is required");
		}
		if (nextIncomeDate == null) {
			throw new InvalidRecurringIncomeDataException("Next income date is required");
		}
		if (active == null) {
			throw new InvalidRecurringIncomeDataException("Active is required");
		}

		return new NormalizedData(
			normalizedDescription,
			normalizedSource,
			amount,
			cadence,
			nextIncomeDate,
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
			throw new InvalidRecurringIncomeDataException(label + " must be at most " + maxLength + " characters");
		}
		return trimmed;
	}

	private void validateAmount(BigDecimal amount) {
		if (amount == null) {
			throw new InvalidRecurringIncomeDataException("Amount is required");
		}
		if (amount.compareTo(BigDecimal.ZERO) <= 0) {
			throw new InvalidRecurringIncomeDataException("Amount must be greater than zero");
		}
		if (amount.scale() > 2) {
			throw new InvalidRecurringIncomeDataException("Amount must have at most 2 decimal places");
		}
		if (amount.compareTo(MAX_AMOUNT) > 0) {
			throw new InvalidRecurringIncomeDataException("Amount must fit NUMERIC(12,2)");
		}
	}

	private RecurringIncomeResponse toResponse(RecurringIncome entity) {
		return new RecurringIncomeResponse(
			entity.getId(),
			entity.getDescription(),
			entity.getSource(),
			entity.getAmount(),
			entity.getCadence(),
			entity.getNextIncomeDate(),
			entity.isActive(),
			entity.getNotes(),
			entity.getCreatedAt(),
			entity.getUpdatedAt()
		);
	}

	private record NormalizedData(
			String description,
			String source,
			BigDecimal amount,
			RecurringIncomeCadence cadence,
			LocalDate nextIncomeDate,
			boolean active,
			String notes
	) {
	}
}
