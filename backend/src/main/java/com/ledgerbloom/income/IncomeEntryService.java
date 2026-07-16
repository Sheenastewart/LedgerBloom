package com.ledgerbloom.income;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.recurring.support.CadenceKind;
import com.ledgerbloom.recurring.support.CadenceScheduleMath;
import com.ledgerbloom.recurringincome.RecurringIncomeOccurrenceRecord;
import com.ledgerbloom.recurringincome.RecurringIncomeOccurrenceRecordRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class IncomeEntryService {

	private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");

	private final IncomeEntryRepository incomeEntryRepository;
	private final RecurringIncomeOccurrenceRecordRepository occurrenceRecordRepository;
	private final CurrentUser currentUser;

	public IncomeEntryService(
			IncomeEntryRepository incomeEntryRepository,
			RecurringIncomeOccurrenceRecordRepository occurrenceRecordRepository,
			CurrentUser currentUser) {
		this.incomeEntryRepository = incomeEntryRepository;
		this.occurrenceRecordRepository = occurrenceRecordRepository;
		this.currentUser = currentUser;
	}

	@Transactional(readOnly = true)
	public List<IncomeEntryResponse> findAll(Integer year, Integer month, String source) {
		String normalizedSource = normalizeSourceFilter(source);
		validateFilter(year, month);
		Long userId = currentUser.requireUserId();

		boolean hasMonth = year != null || month != null;
		boolean hasSource = normalizedSource != null;

		List<IncomeEntry> entries;
		if (hasMonth && hasSource) {
			LocalDate start = YearMonth.of(year, month).atDay(1);
			LocalDate endExclusive = start.plusMonths(1);
			entries = incomeEntryRepository
				.findByUser_IdAndSourceIgnoreCaseAndIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
					userId,
					normalizedSource,
					start,
					endExclusive
				);
		}
		else if (hasMonth) {
			LocalDate start = YearMonth.of(year, month).atDay(1);
			LocalDate endExclusive = start.plusMonths(1);
			entries = incomeEntryRepository
				.findByUser_IdAndIncomeDateGreaterThanEqualAndIncomeDateLessThanOrderByIncomeDateDescIdDesc(
					userId,
					start,
					endExclusive
				);
		}
		else if (hasSource) {
			entries = incomeEntryRepository
				.findByUser_IdAndSourceIgnoreCaseOrderByIncomeDateDescIdDesc(userId, normalizedSource);
		}
		else {
			entries = incomeEntryRepository.findByUser_IdOrderByIncomeDateDescIdDesc(userId);
		}

		Map<Long, RecurringIncomeOccurrenceRecord> occurrenceRecordsByEntryId =
			loadOccurrenceRecordsByEntryId(userId, entries);

		return entries.stream()
			.map(entry -> toResponse(entry, occurrenceRecordsByEntryId.get(entry.getId())))
			.toList();
	}

	@Transactional(readOnly = true)
	public IncomeEntryResponse findById(Long id) {
		Long userId = currentUser.requireUserId();
		IncomeEntry entry = getEntryOrThrow(id, userId);
		RecurringIncomeOccurrenceRecord occurrenceRecord = occurrenceRecordRepository
			.findByIncomeEntry_IdAndRecurringIncome_User_Id(id, userId)
			.orElse(null);
		return toResponse(entry, occurrenceRecord);
	}

	public IncomeEntryResponse create(IncomeEntryCreateRequest request) {
		NormalizedIncomeData data = normalize(
			request.description(),
			request.source(),
			request.amount(),
			request.incomeDate(),
			request.notes()
		);
		IncomeEntry entry = new IncomeEntry(
			currentUser.requireUserReference(),
			data.description(),
			data.source(),
			data.amount(),
			data.incomeDate(),
			data.notes()
		);
		return toResponse(incomeEntryRepository.saveAndFlush(entry), null);
	}

	public IncomeEntryResponse update(Long id, IncomeEntryUpdateRequest request) {
		IncomeEntry entry = getEntryOrThrow(id, currentUser.requireUserId());
		NormalizedIncomeData data = normalize(
			request.description(),
			request.source(),
			request.amount(),
			request.incomeDate(),
			request.notes()
		);
		entry.setDescription(data.description());
		entry.setSource(data.source());
		entry.setAmount(data.amount());
		entry.setIncomeDate(data.incomeDate());
		entry.setNotes(data.notes());
		return toResponse(incomeEntryRepository.saveAndFlush(entry), null);
	}

	public void delete(Long id) {
		IncomeEntry entry = getEntryOrThrow(id, currentUser.requireUserId());
		incomeEntryRepository.delete(entry);
	}

	private IncomeEntry getEntryOrThrow(Long id, Long userId) {
		return incomeEntryRepository.findByIdAndUser_Id(id, userId)
			.orElseThrow(() -> new IncomeEntryNotFoundException(id));
	}

	private String normalizeSourceFilter(String source) {
		if (source == null) {
			return null;
		}
		String trimmed = source.trim();
		return trimmed.isBlank() ? null : trimmed;
	}

	private void validateFilter(Integer year, Integer month) {
		boolean yearPresent = year != null;
		boolean monthPresent = month != null;
		if (yearPresent != monthPresent) {
			throw new InvalidIncomeFilterException("year and month must both be provided together");
		}
		if (monthPresent) {
			if (month < 1 || month > 12) {
				throw new InvalidIncomeFilterException("month must be between 1 and 12");
			}
			if (year < 1 || year > 9999) {
				throw new InvalidIncomeFilterException("year must be a positive value between 1 and 9999");
			}
		}
	}

	private NormalizedIncomeData normalize(
			String description,
			String source,
			BigDecimal amount,
			LocalDate incomeDate,
			String notes) {
		String normalizedDescription = description == null ? "" : description.trim();
		if (normalizedDescription.isBlank()) {
			throw new InvalidIncomeDataException("Description is required");
		}
		if (normalizedDescription.length() > 160) {
			throw new InvalidIncomeDataException("Description must be at most 160 characters");
		}

		String normalizedSource = source == null ? "" : source.trim();
		if (normalizedSource.isBlank()) {
			throw new InvalidIncomeDataException("Source is required");
		}
		if (normalizedSource.length() > 120) {
			throw new InvalidIncomeDataException("Source must be at most 120 characters");
		}

		String normalizedNotes = normalizeOptionalNotes(notes);
		validateAmount(amount);

		if (incomeDate == null) {
			throw new InvalidIncomeDataException("Income date is required");
		}

		return new NormalizedIncomeData(
			normalizedDescription,
			normalizedSource,
			amount,
			incomeDate,
			normalizedNotes
		);
	}

	private String normalizeOptionalNotes(String notes) {
		if (notes == null) {
			return null;
		}
		String normalized = notes.trim();
		return normalized.isBlank() ? null : normalized;
	}

	private void validateAmount(BigDecimal amount) {
		if (amount == null) {
			throw new InvalidIncomeDataException("Amount is required");
		}
		if (amount.compareTo(BigDecimal.ZERO) <= 0) {
			throw new InvalidIncomeDataException("Amount must be greater than zero");
		}
		if (amount.scale() > 2) {
			throw new InvalidIncomeDataException("Amount must have at most 2 decimal places");
		}
		if (amount.compareTo(MAX_AMOUNT) > 0) {
			throw new InvalidIncomeDataException("Amount must fit NUMERIC(12,2)");
		}
	}

	private Map<Long, RecurringIncomeOccurrenceRecord> loadOccurrenceRecordsByEntryId(
			Long userId,
			List<IncomeEntry> entries) {
		if (entries.isEmpty()) {
			return Map.of();
		}
		List<Long> entryIds = entries.stream().map(IncomeEntry::getId).toList();
		return occurrenceRecordRepository.findByIncomeEntryIdsForUser(entryIds, userId).stream()
			.collect(Collectors.toMap(record -> record.getIncomeEntry().getId(), Function.identity()));
	}

	private IncomeEntryResponse toResponse(IncomeEntry entry, RecurringIncomeOccurrenceRecord occurrenceRecord) {
		Long recurringIncomeId = null;
		Boolean canUndoReceived = null;
		if (occurrenceRecord != null) {
			var recurringIncome = occurrenceRecord.getRecurringIncome();
			recurringIncomeId = recurringIncome.getId();
			LocalDate occurrenceDate = occurrenceRecord.getOccurrenceDate();
			CadenceKind cadenceKind = CadenceKind.fromIncome(recurringIncome.getCadence());
			LocalDate expectedNext = CadenceScheduleMath.advance(
				occurrenceDate,
				cadenceKind,
				recurringIncome.getFirstPaymentDay(),
				recurringIncome.getSecondPaymentDay());
			canUndoReceived = recurringIncome.getNextIncomeDate().equals(expectedNext);
		}

		return new IncomeEntryResponse(
			entry.getId(),
			entry.getDescription(),
			entry.getSource(),
			entry.getAmount(),
			entry.getIncomeDate(),
			entry.getNotes(),
			entry.getCreatedAt(),
			entry.getUpdatedAt(),
			recurringIncomeId,
			canUndoReceived
		);
	}

	private record NormalizedIncomeData(
			String description,
			String source,
			BigDecimal amount,
			LocalDate incomeDate,
			String notes
	) {
	}
}
