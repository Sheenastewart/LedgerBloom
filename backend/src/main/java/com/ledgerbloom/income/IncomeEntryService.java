package com.ledgerbloom.income;

import com.ledgerbloom.auth.CurrentUser;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class IncomeEntryService {

	private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");

	private final IncomeEntryRepository incomeEntryRepository;
	private final CurrentUser currentUser;

	public IncomeEntryService(IncomeEntryRepository incomeEntryRepository, CurrentUser currentUser) {
		this.incomeEntryRepository = incomeEntryRepository;
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

		return entries.stream().map(this::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public IncomeEntryResponse findById(Long id) {
		return toResponse(getEntryOrThrow(id, currentUser.requireUserId()));
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
		return toResponse(incomeEntryRepository.saveAndFlush(entry));
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
		return toResponse(incomeEntryRepository.saveAndFlush(entry));
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

	private IncomeEntryResponse toResponse(IncomeEntry entry) {
		return new IncomeEntryResponse(
			entry.getId(),
			entry.getDescription(),
			entry.getSource(),
			entry.getAmount(),
			entry.getIncomeDate(),
			entry.getNotes(),
			entry.getCreatedAt(),
			entry.getUpdatedAt()
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
