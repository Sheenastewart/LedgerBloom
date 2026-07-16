package com.ledgerbloom.recurringincome;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.income.IncomeEntry;
import com.ledgerbloom.income.IncomeEntryCreateRequest;
import com.ledgerbloom.income.IncomeEntryNotFoundException;
import com.ledgerbloom.income.IncomeEntryNotLinkedToRecurringIncomeException;
import com.ledgerbloom.income.IncomeEntryRepository;
import com.ledgerbloom.income.IncomeEntryResponse;
import com.ledgerbloom.income.IncomeEntryService;
import com.ledgerbloom.income.UndoReceivedResponse;
import com.ledgerbloom.recurring.support.CadenceKind;
import com.ledgerbloom.recurring.support.CadenceScheduleMath;
import com.ledgerbloom.recurring.support.CatchUpRequest;
import com.ledgerbloom.recurring.support.HistorySetupMode;
import com.ledgerbloom.recurring.support.OccurrencePreviewItem;
import com.ledgerbloom.recurring.support.OccurrencePreviewRequest;
import com.ledgerbloom.recurring.support.OccurrencePreviewResponse;
import com.ledgerbloom.recurring.support.RecurringPeriodProjection;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class RecurringIncomeService {

	private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");
	private static final int DEFAULT_UPCOMING_DAYS = 30;

	private final RecurringIncomeRepository recurringIncomeRepository;
	private final RecurringIncomeOccurrenceRecordRepository occurrenceRecordRepository;
	private final IncomeEntryService incomeEntryService;
	private final IncomeEntryRepository incomeEntryRepository;
	private final CurrentUser currentUser;

	public RecurringIncomeService(
			RecurringIncomeRepository recurringIncomeRepository,
			RecurringIncomeOccurrenceRecordRepository occurrenceRecordRepository,
			IncomeEntryService incomeEntryService,
			IncomeEntryRepository incomeEntryRepository,
			CurrentUser currentUser) {
		this.recurringIncomeRepository = recurringIncomeRepository;
		this.occurrenceRecordRepository = occurrenceRecordRepository;
		this.incomeEntryService = incomeEntryService;
		this.incomeEntryRepository = incomeEntryRepository;
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

	/**
	 * Returns every unpaid occurrence in {@code [today, today + days]}, expanding weekly
	 * (and other multi-hit) cadences so each payday appears as its own row.
	 */
	@Transactional(readOnly = true)
	public List<RecurringIncomeResponse> findUpcoming(Integer days) {
		int windowDays = days == null ? DEFAULT_UPCOMING_DAYS : days;
		if (windowDays < 1) {
			throw new InvalidRecurringIncomeFilterException("days must be a positive integer");
		}
		LocalDate today = LocalDate.now();
		LocalDate toInclusive = today.plusDays(windowDays);
		Long userId = currentUser.requireUserId();
		List<RecurringIncomeResponse> occurrences = new ArrayList<>();
		for (RecurringIncome schedule : recurringIncomeRepository.findActiveDueOnOrBefore(userId, toInclusive)) {
			for (LocalDate occurrenceDate : RecurringPeriodProjection.incomeDatesInPeriod(
					schedule, today, toInclusive)) {
				occurrences.add(toResponse(schedule, occurrenceDate));
			}
		}
		occurrences.sort(Comparator
			.comparing(RecurringIncomeResponse::nextIncomeDate)
			.thenComparing(RecurringIncomeResponse::id));
		return List.copyOf(occurrences);
	}

	@Transactional(readOnly = true)
	public RecurringIncomeResponse findById(Long id) {
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
			throw new InvalidRecurringIncomeDataException("Start date is required");
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

	public RecurringIncomeResponse create(RecurringIncomeCreateRequest request) {
		NormalizedData data = normalize(
			request.description(),
			request.source(),
			request.amount(),
			request.cadence(),
			request.nextIncomeDate(),
			request.active(),
			request.notes(),
			request.firstPaymentDay(),
			request.secondPaymentDay()
		);

		LocalDate today = LocalDate.now();
		CadenceKind cadenceKind = CadenceKind.fromIncome(data.cadence());
		LocalDate effectiveNext = data.nextIncomeDate();
		List<LocalDate> selectedDates = List.of();

		if (!data.nextIncomeDate().isAfter(today)) {
			HistorySetupMode historyMode = request.historyMode() == null
				? HistorySetupMode.TRACK_FROM_NOW
				: request.historyMode();
			List<LocalDate> preview = CadenceScheduleMath.occurrencesThrough(
				data.nextIncomeDate(), today, cadenceKind, data.firstPaymentDay(), data.secondPaymentDay());
			LocalDate lastPreviewDate = preview.get(preview.size() - 1);

			if (historyMode == HistorySetupMode.TRACK_FROM_NOW) {
				effectiveNext = CadenceScheduleMath.firstOnOrAfter(
					data.nextIncomeDate(), today, cadenceKind, data.firstPaymentDay(), data.secondPaymentDay());
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

		RecurringIncome entity = new RecurringIncome(
			currentUser.requireUserReference(),
			data.description(),
			data.source(),
			data.amount(),
			data.cadence(),
			effectiveNext,
			data.active(),
			data.notes(),
			data.firstPaymentDay(),
			data.secondPaymentDay()
		);
		RecurringIncome saved = recurringIncomeRepository.saveAndFlush(entity);

		for (LocalDate date : selectedDates) {
			recordHistoricalOccurrence(saved, date);
		}

		return toResponse(saved);
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
			request.notes(),
			request.firstPaymentDay(),
			request.secondPaymentDay()
		);
		entity.setDescription(data.description());
		entity.setSource(data.source());
		entity.setAmount(data.amount());
		entity.setCadence(data.cadence());
		entity.setNextIncomeDate(data.nextIncomeDate());
		entity.setActive(data.active());
		entity.setNotes(data.notes());
		entity.setFirstPaymentDay(data.firstPaymentDay());
		entity.setSecondPaymentDay(data.secondPaymentDay());
		return toResponse(recurringIncomeRepository.saveAndFlush(entity));
	}

	public void delete(Long id) {
		RecurringIncome entity = getOrThrow(id, currentUser.requireUserId());
		recurringIncomeRepository.delete(entity);
	}

	/**
	 * Marks a recurring item received inside one transaction:
	 * pessimistic row lock → required expectedNextIncomeDate match → occurrence record
	 * conflict check → create IncomeEntry → link occurrence record → advance next date.
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
		if (occurrenceRecordRepository.existsByRecurringIncome_IdAndOccurrenceDate(id, incomeDate)) {
			throw new RecurringIncomeReceiptConflictException(
				"An occurrence record already exists for " + incomeDate + "; refresh and try again"
			);
		}

		IncomeEntryResponse createdIncomeEntry = incomeEntryService.create(new IncomeEntryCreateRequest(
			entity.getDescription(),
			entity.getSource(),
			entity.getAmount(),
			incomeDate,
			null
		));
		linkOccurrenceRecord(entity, incomeDate, createdIncomeEntry.id());

		entity.setNextIncomeDate(advanceNextIncomeDate(
			incomeDate, entity.getCadence(), entity.getFirstPaymentDay(), entity.getSecondPaymentDay()));
		RecurringIncomeResponse updated = toResponse(recurringIncomeRepository.saveAndFlush(entity));
		return new MarkReceivedResponse(createdIncomeEntry, updated);
	}

	/**
	 * Removes an income entry created from a recurring schedule (mark-received, catch-up, or setup)
	 * and restores nextIncomeDate to the occurrence date when that entry was the latest advance.
	 */
	public UndoReceivedResponse undoReceivedForIncomeEntry(Long incomeEntryId) {
		Long userId = currentUser.requireUserId();
		IncomeEntry entry = incomeEntryRepository.findByIdAndUser_Id(incomeEntryId, userId)
			.orElseThrow(() -> new IncomeEntryNotFoundException(incomeEntryId));

		RecurringIncomeOccurrenceRecord record = occurrenceRecordRepository
			.findByIncomeEntry_IdAndRecurringIncome_User_Id(incomeEntryId, userId)
			.orElseThrow(() -> new IncomeEntryNotLinkedToRecurringIncomeException(incomeEntryId));

		RecurringIncome entity = recurringIncomeRepository.findByIdAndUser_IdForUpdate(
				record.getRecurringIncome().getId(), userId)
			.orElseThrow(() -> new RecurringIncomeNotFoundException(record.getRecurringIncome().getId()));

		LocalDate occurrenceDate = record.getOccurrenceDate();
		CadenceKind cadenceKind = CadenceKind.fromIncome(entity.getCadence());
		LocalDate expectedNext = CadenceScheduleMath.advance(
			occurrenceDate, cadenceKind, entity.getFirstPaymentDay(), entity.getSecondPaymentDay());
		boolean restoreSchedule = entity.getNextIncomeDate().equals(expectedNext);

		occurrenceRecordRepository.delete(record);
		occurrenceRecordRepository.flush();
		incomeEntryRepository.delete(entry);
		incomeEntryRepository.flush();

		LocalDate nextIncomeDate = entity.getNextIncomeDate();
		if (restoreSchedule) {
			entity.setNextIncomeDate(occurrenceDate);
			nextIncomeDate = occurrenceDate;
			recurringIncomeRepository.saveAndFlush(entity);
		}

		return new UndoReceivedResponse(
			incomeEntryId,
			occurrenceDate,
			restoreSchedule,
			nextIncomeDate,
			entity.getId()
		);
	}

	/**
	 * Records ledger entries for caller-selected overdue occurrence dates on an existing
	 * schedule. Locks the row, restricts newly requested dates to the pending window
	 * (current nextIncomeDate through today), skips dates that already have occurrence
	 * records (idempotent retries), and advances nextIncomeDate past every allowed date
	 * when that pending window is non-empty.
	 */
	public RecurringIncomeCatchUpResponse catchUp(Long id, CatchUpRequest request) {
		Long userId = currentUser.requireUserId();
		RecurringIncome entity = recurringIncomeRepository.findByIdAndUser_IdForUpdate(id, userId)
			.orElseThrow(() -> new RecurringIncomeNotFoundException(id));

		List<LocalDate> requestedDates = request.occurrenceDates();
		if (requestedDates == null || requestedDates.isEmpty()) {
			throw new InvalidRecurringIncomeDataException("occurrenceDates must include at least one date");
		}

		LocalDate today = LocalDate.now();
		CadenceKind cadenceKind = CadenceKind.fromIncome(entity.getCadence());
		List<LocalDate> allowedDates = CadenceScheduleMath.occurrencesThrough(
			entity.getNextIncomeDate(), today, cadenceKind, entity.getFirstPaymentDay(), entity.getSecondPaymentDay());
		Set<LocalDate> allowedSet = new HashSet<>(allowedDates);

		List<LocalDate> sortedRequested = requestedDates.stream().distinct().sorted().toList();
		List<LocalDate> pendingRequested = new ArrayList<>();
		for (LocalDate date : sortedRequested) {
			if (!occurrenceRecordRepository.existsByRecurringIncome_IdAndOccurrenceDate(id, date)) {
				pendingRequested.add(date);
			}
		}
		for (LocalDate date : pendingRequested) {
			if (!allowedSet.contains(date)) {
				throw new InvalidRecurringIncomeDataException(
					"occurrenceDates must be a subset of the pending occurrences on or before today"
				);
			}
		}

		List<LocalDate> createdDates = new ArrayList<>();
		List<IncomeEntryResponse> createdEntries = new ArrayList<>();
		for (LocalDate date : pendingRequested) {
			IncomeEntryResponse createdEntry = incomeEntryService.create(new IncomeEntryCreateRequest(
				entity.getDescription(),
				entity.getSource(),
				entity.getAmount(),
				date,
				null
			));
			if (tryLinkOccurrenceRecord(entity, date, createdEntry.id())) {
				createdDates.add(date);
				createdEntries.add(createdEntry);
			}
		}

		LocalDate nextDate = entity.getNextIncomeDate();
		if (!allowedDates.isEmpty()) {
			LocalDate lastAllowed = allowedDates.get(allowedDates.size() - 1);
			nextDate = CadenceScheduleMath.advance(
				lastAllowed, cadenceKind, entity.getFirstPaymentDay(), entity.getSecondPaymentDay());
			entity.setNextIncomeDate(nextDate);
		}
		RecurringIncomeResponse updated = toResponse(recurringIncomeRepository.saveAndFlush(entity));

		return new RecurringIncomeCatchUpResponse(createdDates.size(), createdDates, nextDate, updated, createdEntries);
	}

	public static LocalDate advanceNextIncomeDate(
			LocalDate from,
			RecurringIncomeCadence cadence,
			Integer firstPaymentDay,
			Integer secondPaymentDay) {
		return CadenceScheduleMath.advance(from, CadenceKind.fromIncome(cadence), firstPaymentDay, secondPaymentDay);
	}

	private void recordHistoricalOccurrence(RecurringIncome entity, LocalDate date) {
		IncomeEntryResponse created = incomeEntryService.create(new IncomeEntryCreateRequest(
			entity.getDescription(),
			entity.getSource(),
			entity.getAmount(),
			date,
			null
		));
		linkOccurrenceRecord(entity, date, created.id());
	}

	private void linkOccurrenceRecord(RecurringIncome entity, LocalDate date, Long incomeEntryId) {
		IncomeEntry reference = incomeEntryRepository.getReferenceById(incomeEntryId);
		occurrenceRecordRepository.saveAndFlush(new RecurringIncomeOccurrenceRecord(entity, date, reference));
	}

	/**
	 * Same as {@link #linkOccurrenceRecord} but swallows a unique-constraint race as an
	 * idempotent "already recorded" outcome instead of failing the whole catch-up request.
	 */
	private boolean tryLinkOccurrenceRecord(RecurringIncome entity, LocalDate date, Long incomeEntryId) {
		try {
			linkOccurrenceRecord(entity, date, incomeEntryId);
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
				throw new InvalidRecurringIncomeDataException(
					"selectedOccurrenceDates must be a subset of the previewed occurrences"
				);
			}
		}
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
			String notes,
			Integer firstPaymentDay,
			Integer secondPaymentDay) {
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

		NormalizedDays days = normalizePaymentDays(cadence, firstPaymentDay, secondPaymentDay);

		return new NormalizedData(
			normalizedDescription,
			normalizedSource,
			amount,
			cadence,
			nextIncomeDate,
			active,
			normalizedNotes,
			days.first(),
			days.second()
		);
	}

	private NormalizedDays normalizePaymentDays(
			RecurringIncomeCadence cadence,
			Integer firstPaymentDay,
			Integer secondPaymentDay) {
		if (cadence != RecurringIncomeCadence.SEMIMONTHLY) {
			if (firstPaymentDay != null || secondPaymentDay != null) {
				throw new InvalidRecurringIncomeDataException(
					"firstPaymentDay and secondPaymentDay must be empty unless cadence is SEMIMONTHLY"
				);
			}
			return new NormalizedDays(null, null);
		}
		if (firstPaymentDay == null || secondPaymentDay == null) {
			throw new InvalidRecurringIncomeDataException(
				"firstPaymentDay and secondPaymentDay are required for SEMIMONTHLY cadence"
			);
		}
		if (firstPaymentDay < 1 || firstPaymentDay > 31 || secondPaymentDay < 1 || secondPaymentDay > 31) {
			throw new InvalidRecurringIncomeDataException("firstPaymentDay and secondPaymentDay must be between 1 and 31");
		}
		if (firstPaymentDay.equals(secondPaymentDay)) {
			throw new InvalidRecurringIncomeDataException("firstPaymentDay and secondPaymentDay must be different");
		}
		int[] sorted = CadenceScheduleMath.sortedPaymentDays(firstPaymentDay, secondPaymentDay);
		return new NormalizedDays(sorted[0], sorted[1]);
	}

	private void validatePreviewDays(CadenceKind cadence, Integer firstPaymentDay, Integer secondPaymentDay) {
		if (cadence == null) {
			throw new InvalidRecurringIncomeDataException("Cadence is required");
		}
		if (cadence != CadenceKind.SEMIMONTHLY) {
			if (firstPaymentDay != null || secondPaymentDay != null) {
				throw new InvalidRecurringIncomeDataException(
					"firstPaymentDay and secondPaymentDay must be empty unless cadence is SEMIMONTHLY"
				);
			}
			return;
		}
		if (firstPaymentDay == null || secondPaymentDay == null) {
			throw new InvalidRecurringIncomeDataException(
				"firstPaymentDay and secondPaymentDay are required for SEMIMONTHLY cadence"
			);
		}
		if (firstPaymentDay < 1 || firstPaymentDay > 31 || secondPaymentDay < 1 || secondPaymentDay > 31) {
			throw new InvalidRecurringIncomeDataException("firstPaymentDay and secondPaymentDay must be between 1 and 31");
		}
		if (firstPaymentDay.equals(secondPaymentDay)) {
			throw new InvalidRecurringIncomeDataException("firstPaymentDay and secondPaymentDay must be different");
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
		return toResponse(entity, entity.getNextIncomeDate());
	}

	/** Upcoming rows use {@code occurrenceDate} so each payday in the window is listed. */
	private RecurringIncomeResponse toResponse(RecurringIncome entity, LocalDate occurrenceDate) {
		return new RecurringIncomeResponse(
			entity.getId(),
			entity.getDescription(),
			entity.getSource(),
			entity.getAmount(),
			entity.getCadence(),
			occurrenceDate,
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
			String source,
			BigDecimal amount,
			RecurringIncomeCadence cadence,
			LocalDate nextIncomeDate,
			boolean active,
			String notes,
			Integer firstPaymentDay,
			Integer secondPaymentDay
	) {
	}

	private record NormalizedDays(Integer first, Integer second) {
	}
}
