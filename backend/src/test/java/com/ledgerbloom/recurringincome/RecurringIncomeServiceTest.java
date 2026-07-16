package com.ledgerbloom.recurringincome;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.income.IncomeEntry;
import com.ledgerbloom.income.IncomeEntryCreateRequest;
import com.ledgerbloom.income.IncomeEntryNotLinkedToRecurringIncomeException;
import com.ledgerbloom.income.IncomeEntryRepository;
import com.ledgerbloom.income.IncomeEntryResponse;
import com.ledgerbloom.income.IncomeEntryService;
import com.ledgerbloom.income.InvalidIncomeDataException;
import com.ledgerbloom.income.UndoReceivedResponse;
import com.ledgerbloom.recurring.support.CadenceKind;
import com.ledgerbloom.recurring.support.CadenceScheduleMath;
import com.ledgerbloom.recurring.support.CatchUpRequest;
import com.ledgerbloom.recurring.support.HistorySetupMode;
import com.ledgerbloom.recurring.support.OccurrencePreviewRequest;
import com.ledgerbloom.recurring.support.OccurrencePreviewResponse;
import com.ledgerbloom.user.User;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RecurringIncomeServiceTest {

	private static final Long USER_ID = 1L;

	@Mock
	private RecurringIncomeRepository recurringIncomeRepository;

	@Mock
	private RecurringIncomeOccurrenceRecordRepository occurrenceRecordRepository;

	@Mock
	private IncomeEntryService incomeEntryService;

	@Mock
	private IncomeEntryRepository incomeEntryRepository;

	@Mock
	private CurrentUser currentUser;

	@InjectMocks
	private RecurringIncomeService recurringIncomeService;

	private User user;

	@BeforeEach
	void setUp() throws Exception {
		user = new User("user@example.com", "hash", "Test User");
		setId(user, USER_ID);
		lenient().when(currentUser.requireUserId()).thenReturn(USER_ID);
		lenient().when(currentUser.requireUserReference()).thenReturn(user);
	}

	@Test
	void createValidRecurringIncome() throws Exception {
		when(recurringIncomeRepository.saveAndFlush(any(RecurringIncome.class))).thenAnswer(invocation -> {
			RecurringIncome entity = invocation.getArgument(0);
			setId(entity, 10L);
			onCreate(entity);
			return entity;
		});

		RecurringIncomeResponse response = recurringIncomeService.create(createRequest(
			"Salary",
			"Acme Corp",
			"5000.00",
			RecurringIncomeCadence.MONTHLY,
			LocalDate.of(2026, 8, 1),
			true,
			"Primary job"
		));

		assertThat(response.id()).isEqualTo(10L);
		assertThat(response.description()).isEqualTo("Salary");
		assertThat(response.source()).isEqualTo("Acme Corp");
		assertThat(response.amount()).isEqualByComparingTo("5000.00");
		assertThat(response.cadence()).isEqualTo(RecurringIncomeCadence.MONTHLY);
		assertThat(response.active()).isTrue();
		assertThat(response.notes()).isEqualTo("Primary job");
	}

	@Test
	void createNormalizesSourceAndNotes() throws Exception {
		when(recurringIncomeRepository.saveAndFlush(any(RecurringIncome.class))).thenAnswer(invocation -> {
			RecurringIncome entity = invocation.getArgument(0);
			setId(entity, 11L);
			onCreate(entity);
			return entity;
		});

		recurringIncomeService.create(createRequest(
			"  Freelance  ",
			"  Client A  ",
			"1500.00",
			RecurringIncomeCadence.MONTHLY,
			LocalDate.of(2026, 8, 1),
			true,
			"   "
		));

		ArgumentCaptor<RecurringIncome> captor = ArgumentCaptor.forClass(RecurringIncome.class);
		verify(recurringIncomeRepository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getDescription()).isEqualTo("Freelance");
		assertThat(captor.getValue().getSource()).isEqualTo("Client A");
		assertThat(captor.getValue().getNotes()).isNull();
	}

	@Test
	void createRejectsBlankDescription() {
		assertThatThrownBy(() -> recurringIncomeService.create(createRequest(
			"   ",
			"Acme Corp",
			"5000.00",
			RecurringIncomeCadence.WEEKLY,
			LocalDate.of(2026, 8, 1),
			true,
			null
		))).isInstanceOf(InvalidRecurringIncomeDataException.class);
		verify(recurringIncomeRepository, never()).saveAndFlush(any());
	}

	@Test
	void createRejectsBlankSource() {
		assertThatThrownBy(() -> recurringIncomeService.create(createRequest(
			"Salary",
			"   ",
			"5000.00",
			RecurringIncomeCadence.MONTHLY,
			LocalDate.of(2026, 8, 1),
			true,
			null
		))).isInstanceOf(InvalidRecurringIncomeDataException.class);
	}

	@Test
	void createRejectsInvalidAmount() {
		assertThatThrownBy(() -> recurringIncomeService.create(createRequest(
			"Salary",
			"Acme Corp",
			"0",
			RecurringIncomeCadence.MONTHLY,
			LocalDate.of(2026, 8, 1),
			true,
			null
		))).isInstanceOf(InvalidRecurringIncomeDataException.class);
	}

	@Test
	void getByIdAndMissing() throws Exception {
		RecurringIncome entity = sampleEntity(10L, LocalDate.of(2026, 8, 1), true);
		when(recurringIncomeRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(recurringIncomeRepository.findByIdAndUser_Id(99L, USER_ID)).thenReturn(Optional.empty());

		assertThat(recurringIncomeService.findById(10L).description()).isEqualTo("Salary");
		assertThatThrownBy(() -> recurringIncomeService.findById(99L))
			.isInstanceOf(RecurringIncomeNotFoundException.class);
	}

	@Test
	void updateAndDelete() throws Exception {
		RecurringIncome entity = sampleEntity(10L, LocalDate.of(2026, 8, 1), true);
		when(recurringIncomeRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(recurringIncomeRepository.saveAndFlush(any(RecurringIncome.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));

		RecurringIncomeResponse updated = recurringIncomeService.update(10L, updateRequest(
			"Salary Plus",
			"Acme Corp",
			"5500.00",
			RecurringIncomeCadence.MONTHLY,
			LocalDate.of(2026, 9, 1),
			false,
			null
		));
		assertThat(updated.description()).isEqualTo("Salary Plus");
		assertThat(updated.active()).isFalse();

		recurringIncomeService.delete(10L);
		verify(recurringIncomeRepository).delete(entity);
	}

	@Test
	void filtersForwardToRepository() {
		when(recurringIncomeRepository.findFiltered(USER_ID, true, RecurringIncomeCadence.MONTHLY, true, "acme corp"))
			.thenReturn(List.of());
		recurringIncomeService.findAll(true, "MONTHLY", "Acme Corp");
		verify(recurringIncomeRepository).findFiltered(USER_ID, true, RecurringIncomeCadence.MONTHLY, true, "acme corp");
	}

	@Test
	void findAllWithNullSourceAvoidsNullBindThatBreaksPostgresLower() {
		when(recurringIncomeRepository.findFiltered(USER_ID, null, null, false, "")).thenReturn(List.of());

		recurringIncomeService.findAll(null, null, null);

		verify(recurringIncomeRepository).findFiltered(USER_ID, null, null, false, "");
	}

	@Test
	void findAllWithBlankSourceTreatedAsNoSourceFilter() {
		when(recurringIncomeRepository.findFiltered(USER_ID, null, null, false, "")).thenReturn(List.of());

		recurringIncomeService.findAll(null, null, "   ");

		verify(recurringIncomeRepository).findFiltered(USER_ID, null, null, false, "");
	}

	@Test
	void filterRejectsInvalidCadence() {
		assertThatThrownBy(() -> recurringIncomeService.findAll(null, "DAILY", null))
			.isInstanceOf(InvalidRecurringIncomeFilterException.class);
	}

	@Test
	void upcomingDefaultAndCustomDays() {
		LocalDate today = LocalDate.now();
		when(recurringIncomeRepository.findUpcoming(USER_ID, today, today.plusDays(30))).thenReturn(List.of());
		when(recurringIncomeRepository.findUpcoming(USER_ID, today, today.plusDays(7))).thenReturn(List.of());

		recurringIncomeService.findUpcoming(null);
		recurringIncomeService.findUpcoming(7);

		verify(recurringIncomeRepository).findUpcoming(USER_ID, today, today.plusDays(30));
		verify(recurringIncomeRepository).findUpcoming(USER_ID, today, today.plusDays(7));
	}

	@Test
	void upcomingRejectsNonPositiveDays() {
		assertThatThrownBy(() -> recurringIncomeService.findUpcoming(0))
			.isInstanceOf(InvalidRecurringIncomeFilterException.class);
	}

	@Test
	void cadenceAdvanceCalculations() {
		assertThat(RecurringIncomeService.advanceNextIncomeDate(
			LocalDate.of(2026, 7, 10), RecurringIncomeCadence.WEEKLY, null, null))
			.isEqualTo(LocalDate.of(2026, 7, 17));
		assertThat(RecurringIncomeService.advanceNextIncomeDate(
			LocalDate.of(2026, 7, 10), RecurringIncomeCadence.BIWEEKLY, null, null))
			.isEqualTo(LocalDate.of(2026, 7, 24));
		assertThat(RecurringIncomeService.advanceNextIncomeDate(
			LocalDate.of(2026, 1, 31), RecurringIncomeCadence.MONTHLY, null, null))
			.isEqualTo(LocalDate.of(2026, 2, 28));
		assertThat(RecurringIncomeService.advanceNextIncomeDate(
			LocalDate.of(2026, 1, 15), RecurringIncomeCadence.QUARTERLY, null, null))
			.isEqualTo(LocalDate.of(2026, 4, 15));
		assertThat(RecurringIncomeService.advanceNextIncomeDate(
			LocalDate.of(2026, 1, 15), RecurringIncomeCadence.SEMIANNUAL, null, null))
			.isEqualTo(LocalDate.of(2026, 7, 15));
		assertThat(RecurringIncomeService.advanceNextIncomeDate(
			LocalDate.of(2024, 2, 29), RecurringIncomeCadence.ANNUAL, null, null))
			.isEqualTo(LocalDate.of(2025, 2, 28));
		assertThat(RecurringIncomeService.advanceNextIncomeDate(
			LocalDate.of(2026, 7, 1), RecurringIncomeCadence.SEMIMONTHLY, 1, 15))
			.isEqualTo(LocalDate.of(2026, 7, 15));
		assertThat(RecurringIncomeService.advanceNextIncomeDate(
			LocalDate.of(2026, 7, 15), RecurringIncomeCadence.SEMIMONTHLY, 1, 15))
			.isEqualTo(LocalDate.of(2026, 8, 1));
	}

	@Test
	void markReceivedCreatesIncomeEntryAndAdvancesDate() throws Exception {
		LocalDate next = LocalDate.of(2026, 7, 15);
		RecurringIncome entity = sampleEntity(10L, next, true);
		when(recurringIncomeRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(incomeEntryService.create(any(IncomeEntryCreateRequest.class))).thenReturn(sampleIncomeEntryResponse());
		when(recurringIncomeRepository.saveAndFlush(any(RecurringIncome.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));

		MarkReceivedResponse response = recurringIncomeService.markReceived(
			10L,
			new MarkReceivedRequest(next)
		);

		ArgumentCaptor<IncomeEntryCreateRequest> incomeCaptor = ArgumentCaptor.forClass(IncomeEntryCreateRequest.class);
		verify(incomeEntryService).create(incomeCaptor.capture());
		IncomeEntryCreateRequest incomeRequest = incomeCaptor.getValue();
		assertThat(incomeRequest.description()).isEqualTo("Salary");
		assertThat(incomeRequest.source()).isEqualTo("Acme Corp");
		assertThat(incomeRequest.amount()).isEqualByComparingTo("5000.00");
		assertThat(incomeRequest.incomeDate()).isEqualTo(next);
		assertThat(incomeRequest.notes()).isNull();

		assertThat(response.updatedRecurringIncome().nextIncomeDate()).isEqualTo(LocalDate.of(2026, 8, 15));
		assertThat(response.createdIncomeEntry().id()).isEqualTo(50L);
	}

	@Test
	void markReceivedRejectsStaleExpectedDate() throws Exception {
		RecurringIncome entity = sampleEntity(10L, LocalDate.of(2026, 8, 1), true);
		when(recurringIncomeRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));

		assertThatThrownBy(() -> recurringIncomeService.markReceived(
			10L,
			new MarkReceivedRequest(LocalDate.of(2026, 7, 1))
		)).isInstanceOf(RecurringIncomeReceiptConflictException.class);

		verify(incomeEntryService, never()).create(any());
		verify(recurringIncomeRepository, never()).saveAndFlush(any());
	}

	@Test
	void markReceivedRepeatedOriginalExpectedDateDoesNotCreateSecondIncomeEntry() throws Exception {
		LocalDate original = LocalDate.of(2026, 7, 15);
		RecurringIncome entity = sampleEntity(10L, original, true);
		when(recurringIncomeRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(incomeEntryService.create(any(IncomeEntryCreateRequest.class))).thenReturn(sampleIncomeEntryResponse());
		when(recurringIncomeRepository.saveAndFlush(any(RecurringIncome.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));

		recurringIncomeService.markReceived(10L, new MarkReceivedRequest(original));
		assertThat(entity.getNextIncomeDate()).isEqualTo(LocalDate.of(2026, 8, 15));

		assertThatThrownBy(() -> recurringIncomeService.markReceived(10L, new MarkReceivedRequest(original)))
			.isInstanceOf(RecurringIncomeReceiptConflictException.class);

		verify(incomeEntryService).create(any(IncomeEntryCreateRequest.class));
		assertThat(entity.getNextIncomeDate()).isEqualTo(LocalDate.of(2026, 8, 15));
	}

	@Test
	void markReceivedRollsBackWhenIncomeEntryCreateFails() throws Exception {
		RecurringIncome entity = sampleEntity(10L, LocalDate.of(2026, 7, 15), true);
		when(recurringIncomeRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(incomeEntryService.create(any(IncomeEntryCreateRequest.class)))
			.thenThrow(new InvalidIncomeDataException("Amount must be greater than zero"));

		assertThatThrownBy(() -> recurringIncomeService.markReceived(
			10L,
			new MarkReceivedRequest(LocalDate.of(2026, 7, 15))
		)).isInstanceOf(InvalidIncomeDataException.class);

		assertThat(entity.getNextIncomeDate()).isEqualTo(LocalDate.of(2026, 7, 15));
		verify(recurringIncomeRepository, never()).saveAndFlush(any());
	}

	@Test
	void createRejectsSemimonthlyWithoutPaymentDays() {
		assertThatThrownBy(() -> recurringIncomeService.create(createRequest(
			"Salary", "Acme Corp", "5000.00", RecurringIncomeCadence.SEMIMONTHLY,
			LocalDate.now().plusMonths(1), true, null, null, null, null, null
		))).isInstanceOf(InvalidRecurringIncomeDataException.class);
		verify(recurringIncomeRepository, never()).saveAndFlush(any());
	}

	@Test
	void createRejectsPaymentDaysForNonSemimonthlyCadence() {
		assertThatThrownBy(() -> recurringIncomeService.create(createRequest(
			"Salary", "Acme Corp", "5000.00", RecurringIncomeCadence.MONTHLY,
			LocalDate.now().plusMonths(1), true, null, 1, 15, null, null
		))).isInstanceOf(InvalidRecurringIncomeDataException.class);
	}

	@Test
	void createNormalizesSemimonthlyDaysToAscendingOrder() throws Exception {
		when(recurringIncomeRepository.saveAndFlush(any(RecurringIncome.class))).thenAnswer(invocation -> {
			RecurringIncome entity = invocation.getArgument(0);
			setId(entity, 22L);
			onCreate(entity);
			return entity;
		});

		RecurringIncomeResponse response = recurringIncomeService.create(createRequest(
			"Salary", "Acme Corp", "5000.00", RecurringIncomeCadence.SEMIMONTHLY,
			LocalDate.now().plusMonths(1), true, null, 15, 1, null, null
		));

		assertThat(response.firstPaymentDay()).isEqualTo(1);
		assertThat(response.secondPaymentDay()).isEqualTo(15);
	}

	@Test
	void createWithPastStartDateDefaultsToTrackFromNowAndSkipsEntryCreation() throws Exception {
		LocalDate today = LocalDate.now();
		LocalDate start = today.minusWeeks(5);
		when(recurringIncomeRepository.saveAndFlush(any(RecurringIncome.class))).thenAnswer(invocation -> {
			RecurringIncome entity = invocation.getArgument(0);
			setId(entity, 20L);
			onCreate(entity);
			return entity;
		});

		RecurringIncomeResponse response = recurringIncomeService.create(createRequest(
			"Salary", "Acme Corp", "5000.00", RecurringIncomeCadence.WEEKLY, start, true, null, null, null, null, null
		));

		LocalDate expectedNext = CadenceScheduleMath.firstOnOrAfter(start, today, CadenceKind.WEEKLY, null, null);
		assertThat(response.nextIncomeDate()).isEqualTo(expectedNext);
		verify(incomeEntryService, never()).create(any());
		verify(occurrenceRecordRepository, never()).saveAndFlush(any());
	}

	@Test
	void createWithPastStartDateRecordSelectedCreatesEntriesForSelectedDatesOnly() throws Exception {
		LocalDate today = LocalDate.now();
		LocalDate start = today.minusWeeks(5);
		when(recurringIncomeRepository.saveAndFlush(any(RecurringIncome.class))).thenAnswer(invocation -> {
			RecurringIncome entity = invocation.getArgument(0);
			setId(entity, 21L);
			onCreate(entity);
			return entity;
		});
		when(incomeEntryService.create(any(IncomeEntryCreateRequest.class))).thenAnswer(invocation -> {
			IncomeEntryCreateRequest req = invocation.getArgument(0);
			return new IncomeEntryResponse(
				77L, req.description(), req.source(), req.amount(), req.incomeDate(), req.notes(),
				Instant.now(), Instant.now(), null, null
			);
		});
		when(incomeEntryRepository.getReferenceById(anyLong())).thenReturn(mock(IncomeEntry.class));

		List<LocalDate> preview = CadenceScheduleMath.occurrencesThrough(start, today, CadenceKind.WEEKLY, null, null);
		List<LocalDate> selected = List.of(preview.get(0), preview.get(preview.size() - 1));

		RecurringIncomeResponse response = recurringIncomeService.create(createRequest(
			"Salary", "Acme Corp", "5000.00", RecurringIncomeCadence.WEEKLY, start, true, null,
			null, null, HistorySetupMode.RECORD_SELECTED, selected
		));

		LocalDate expectedNext = CadenceScheduleMath.advance(
			preview.get(preview.size() - 1), CadenceKind.WEEKLY, null, null);
		assertThat(response.nextIncomeDate()).isEqualTo(expectedNext);
		verify(incomeEntryService, times(2)).create(any(IncomeEntryCreateRequest.class));
		verify(occurrenceRecordRepository, times(2)).saveAndFlush(any());
	}

	@Test
	void createRejectsSelectedDatesNotInPreview() {
		LocalDate today = LocalDate.now();
		LocalDate start = today.minusWeeks(5);
		assertThatThrownBy(() -> recurringIncomeService.create(createRequest(
			"Salary", "Acme Corp", "5000.00", RecurringIncomeCadence.WEEKLY, start, true, null,
			null, null, HistorySetupMode.RECORD_SELECTED, List.of(today.plusDays(100))
		))).isInstanceOf(InvalidRecurringIncomeDataException.class);
	}

	@Test
	void previewOccurrencesReturnsDatesThroughTodayAndSuggestedNext() {
		LocalDate today = LocalDate.now();
		LocalDate start = today.minusWeeks(3);

		OccurrencePreviewResponse response = recurringIncomeService.previewOccurrences(
			new OccurrencePreviewRequest(CadenceKind.WEEKLY, start, new BigDecimal("100.00"), null, null)
		);

		List<LocalDate> expectedDates = CadenceScheduleMath.occurrencesThrough(start, today, CadenceKind.WEEKLY, null, null);
		assertThat(response.occurrences()).hasSize(expectedDates.size());
		assertThat(response.occurrences().get(0).occurrenceDate()).isEqualTo(expectedDates.get(0));
		assertThat(response.suggestedNextOnOrAfterToday())
			.isEqualTo(CadenceScheduleMath.firstOnOrAfter(start, today, CadenceKind.WEEKLY, null, null));
	}

	@Test
	void previewOccurrencesFutureStartReturnsEmptyListAndSuggestedNextEqualsStart() {
		LocalDate start = LocalDate.now().plusMonths(1);

		OccurrencePreviewResponse response = recurringIncomeService.previewOccurrences(
			new OccurrencePreviewRequest(CadenceKind.MONTHLY, start, new BigDecimal("100.00"), null, null)
		);

		assertThat(response.occurrences()).isEmpty();
		assertThat(response.suggestedNextOnOrAfterToday()).isEqualTo(start);
	}

	@Test
	void catchUpCreatesEntriesForSelectedDatesAndAdvancesPastAllAllowedDates() throws Exception {
		LocalDate today = LocalDate.now();
		LocalDate next = today.minusMonths(3);
		RecurringIncome entity = sampleEntity(10L, next, true);
		when(recurringIncomeRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(recurringIncomeRepository.saveAndFlush(any(RecurringIncome.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));
		when(incomeEntryService.create(any(IncomeEntryCreateRequest.class))).thenAnswer(invocation -> {
			IncomeEntryCreateRequest req = invocation.getArgument(0);
			return new IncomeEntryResponse(
				99L, req.description(), req.source(), req.amount(), req.incomeDate(), req.notes(),
				Instant.now(), Instant.now(), null, null
			);
		});
		when(incomeEntryRepository.getReferenceById(anyLong())).thenReturn(mock(IncomeEntry.class));

		List<LocalDate> allowed = CadenceScheduleMath.occurrencesThrough(next, today, CadenceKind.MONTHLY, null, null);
		LocalDate expectedNext = CadenceScheduleMath.advance(allowed.get(allowed.size() - 1), CadenceKind.MONTHLY, null, null);
		List<LocalDate> selected = List.of(allowed.get(0), allowed.get(allowed.size() - 1));

		RecurringIncomeCatchUpResponse response = recurringIncomeService.catchUp(10L, new CatchUpRequest(selected));

		assertThat(response.createdCount()).isEqualTo(2);
		assertThat(response.createdDates()).containsExactlyElementsOf(selected.stream().sorted().toList());
		assertThat(response.nextOccurrenceDate()).isEqualTo(expectedNext);
		assertThat(response.updatedRecurringIncome().nextIncomeDate()).isEqualTo(expectedNext);
		verify(incomeEntryService, times(2)).create(any(IncomeEntryCreateRequest.class));
	}

	@Test
	void catchUpSkipsDatesThatAlreadyHaveOccurrenceRecords() throws Exception {
		LocalDate today = LocalDate.now();
		LocalDate next = today.minusWeeks(1);
		RecurringIncome entity = sampleEntity(10L, next, true);
		when(recurringIncomeRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(recurringIncomeRepository.saveAndFlush(any(RecurringIncome.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));
		when(occurrenceRecordRepository.existsByRecurringIncome_IdAndOccurrenceDate(10L, next)).thenReturn(true);

		List<LocalDate> allowed = CadenceScheduleMath.occurrencesThrough(next, today, CadenceKind.MONTHLY, null, null);
		LocalDate expectedNext = CadenceScheduleMath.advance(allowed.get(allowed.size() - 1), CadenceKind.MONTHLY, null, null);

		RecurringIncomeCatchUpResponse response = recurringIncomeService.catchUp(10L, new CatchUpRequest(List.of(next)));

		assertThat(response.createdCount()).isEqualTo(0);
		assertThat(response.createdDates()).isEmpty();
		assertThat(response.nextOccurrenceDate()).isEqualTo(expectedNext);
		verify(incomeEntryService, never()).create(any());
	}

	@Test
	void catchUpIdempotentRetryAfterAdvanceReturnsZeroWithoutCreatingEntries() throws Exception {
		LocalDate today = LocalDate.now();
		LocalDate alreadyRecorded = today.minusMonths(1);
		LocalDate nextAfterCatchUp = today.plusDays(1);
		RecurringIncome entity = sampleEntity(10L, nextAfterCatchUp, true);
		when(recurringIncomeRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(recurringIncomeRepository.saveAndFlush(any(RecurringIncome.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));
		when(occurrenceRecordRepository.existsByRecurringIncome_IdAndOccurrenceDate(10L, alreadyRecorded))
			.thenReturn(true);

		RecurringIncomeCatchUpResponse response = recurringIncomeService.catchUp(
			10L, new CatchUpRequest(List.of(alreadyRecorded)));

		assertThat(response.createdCount()).isEqualTo(0);
		assertThat(response.createdDates()).isEmpty();
		assertThat(response.nextOccurrenceDate()).isEqualTo(nextAfterCatchUp);
		verify(incomeEntryService, never()).create(any());
	}

	@Test
	void catchUpRejectsDateOutsideAllowedRange() throws Exception {
		LocalDate today = LocalDate.now();
		LocalDate next = today.minusWeeks(1);
		RecurringIncome entity = sampleEntity(10L, next, true);
		when(recurringIncomeRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));

		assertThatThrownBy(() -> recurringIncomeService.catchUp(10L, new CatchUpRequest(List.of(today.plusDays(30)))))
			.isInstanceOf(InvalidRecurringIncomeDataException.class);
		verify(incomeEntryService, never()).create(any());
	}

	@Test
	void undoReceivedForIncomeEntryRestoresScheduleWhenLatestMarkReceived() throws Exception {
		LocalDate markedDate = LocalDate.of(2026, 7, 15);
		LocalDate advancedNext = LocalDate.of(2026, 8, 15);
		RecurringIncome entity = sampleEntity(10L, advancedNext, true);
		IncomeEntry entry = new IncomeEntry(user, "Salary", "Acme Corp", new BigDecimal("5000.00"), markedDate, null);
		setId(entry, 50L);
		RecurringIncomeOccurrenceRecord record = new RecurringIncomeOccurrenceRecord(entity, markedDate, entry);

		when(incomeEntryRepository.findByIdAndUser_Id(50L, USER_ID)).thenReturn(Optional.of(entry));
		when(occurrenceRecordRepository.findByIncomeEntry_IdAndRecurringIncome_User_Id(50L, USER_ID))
			.thenReturn(Optional.of(record));
		when(recurringIncomeRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(recurringIncomeRepository.saveAndFlush(any(RecurringIncome.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));

		UndoReceivedResponse response = recurringIncomeService.undoReceivedForIncomeEntry(50L);

		assertThat(response.removedIncomeEntryId()).isEqualTo(50L);
		assertThat(response.occurrenceDate()).isEqualTo(markedDate);
		assertThat(response.scheduleRestored()).isTrue();
		assertThat(response.nextIncomeDate()).isEqualTo(markedDate);
		assertThat(response.recurringIncomeId()).isEqualTo(10L);
		assertThat(entity.getNextIncomeDate()).isEqualTo(markedDate);
		verify(occurrenceRecordRepository).delete(record);
		verify(incomeEntryRepository).delete(entry);
	}

	@Test
	void undoReceivedForIncomeEntryRemovesEntryWithoutRestoringScheduleWhenLaterOccurrencesExist() throws Exception {
		LocalDate markedDate = LocalDate.of(2026, 7, 15);
		LocalDate laterNext = LocalDate.of(2026, 9, 15);
		RecurringIncome entity = sampleEntity(10L, laterNext, true);
		IncomeEntry entry = new IncomeEntry(user, "Salary", "Acme Corp", new BigDecimal("5000.00"), markedDate, null);
		setId(entry, 50L);
		RecurringIncomeOccurrenceRecord record = new RecurringIncomeOccurrenceRecord(entity, markedDate, entry);

		when(incomeEntryRepository.findByIdAndUser_Id(50L, USER_ID)).thenReturn(Optional.of(entry));
		when(occurrenceRecordRepository.findByIncomeEntry_IdAndRecurringIncome_User_Id(50L, USER_ID))
			.thenReturn(Optional.of(record));
		when(recurringIncomeRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));

		UndoReceivedResponse response = recurringIncomeService.undoReceivedForIncomeEntry(50L);

		assertThat(response.scheduleRestored()).isFalse();
		assertThat(response.nextIncomeDate()).isEqualTo(laterNext);
		assertThat(entity.getNextIncomeDate()).isEqualTo(laterNext);
		verify(recurringIncomeRepository, never()).saveAndFlush(any());
	}

	@Test
	void undoReceivedForIncomeEntryRejectsManualIncomeEntry() throws Exception {
		IncomeEntry entry = new IncomeEntry(user, "Bonus", "Client", new BigDecimal("100.00"), LocalDate.now(), null);
		setId(entry, 50L);
		when(incomeEntryRepository.findByIdAndUser_Id(50L, USER_ID)).thenReturn(Optional.of(entry));
		when(occurrenceRecordRepository.findByIncomeEntry_IdAndRecurringIncome_User_Id(50L, USER_ID))
			.thenReturn(Optional.empty());

		assertThatThrownBy(() -> recurringIncomeService.undoReceivedForIncomeEntry(50L))
			.isInstanceOf(IncomeEntryNotLinkedToRecurringIncomeException.class);

		verify(incomeEntryRepository, never()).delete(any());
	}

	@Test
	void markReceivedWritesOccurrenceRecordLinkedToCreatedEntry() throws Exception {
		LocalDate next = LocalDate.of(2026, 7, 15);
		RecurringIncome entity = sampleEntity(10L, next, true);
		when(recurringIncomeRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(incomeEntryService.create(any(IncomeEntryCreateRequest.class))).thenReturn(sampleIncomeEntryResponse());
		when(recurringIncomeRepository.saveAndFlush(any(RecurringIncome.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));
		IncomeEntry entryRef = mock(IncomeEntry.class);
		when(incomeEntryRepository.getReferenceById(50L)).thenReturn(entryRef);

		recurringIncomeService.markReceived(10L, new MarkReceivedRequest(next));

		ArgumentCaptor<RecurringIncomeOccurrenceRecord> captor = ArgumentCaptor.forClass(RecurringIncomeOccurrenceRecord.class);
		verify(occurrenceRecordRepository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getOccurrenceDate()).isEqualTo(next);
		assertThat(captor.getValue().getIncomeEntry()).isEqualTo(entryRef);
	}

	@Test
	void markReceivedThrowsConflictWhenOccurrenceRecordAlreadyExists() throws Exception {
		LocalDate next = LocalDate.of(2026, 7, 15);
		RecurringIncome entity = sampleEntity(10L, next, true);
		when(recurringIncomeRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(occurrenceRecordRepository.existsByRecurringIncome_IdAndOccurrenceDate(10L, next)).thenReturn(true);

		assertThatThrownBy(() -> recurringIncomeService.markReceived(10L, new MarkReceivedRequest(next)))
			.isInstanceOf(RecurringIncomeReceiptConflictException.class);

		verify(incomeEntryService, never()).create(any());
		verify(recurringIncomeRepository, never()).saveAndFlush(any());
	}

	private RecurringIncomeCreateRequest createRequest(
			String description,
			String source,
			String amount,
			RecurringIncomeCadence cadence,
			LocalDate nextIncomeDate,
			boolean active,
			String notes) {
		return createRequest(description, source, amount, cadence, nextIncomeDate, active, notes, null, null, null, null);
	}

	private RecurringIncomeCreateRequest createRequest(
			String description,
			String source,
			String amount,
			RecurringIncomeCadence cadence,
			LocalDate nextIncomeDate,
			boolean active,
			String notes,
			Integer firstPaymentDay,
			Integer secondPaymentDay,
			HistorySetupMode historyMode,
			List<LocalDate> selectedOccurrenceDates) {
		return new RecurringIncomeCreateRequest(
			description,
			source,
			new BigDecimal(amount),
			cadence,
			nextIncomeDate,
			active,
			notes,
			firstPaymentDay,
			secondPaymentDay,
			historyMode,
			selectedOccurrenceDates
		);
	}

	private RecurringIncomeUpdateRequest updateRequest(
			String description,
			String source,
			String amount,
			RecurringIncomeCadence cadence,
			LocalDate nextIncomeDate,
			boolean active,
			String notes) {
		return new RecurringIncomeUpdateRequest(
			description,
			source,
			new BigDecimal(amount),
			cadence,
			nextIncomeDate,
			active,
			notes,
			null,
			null
		);
	}

	private RecurringIncome sampleEntity(Long id, LocalDate nextIncomeDate, boolean active) throws Exception {
		RecurringIncome entity = new RecurringIncome(
			user,
			"Salary",
			"Acme Corp",
			new BigDecimal("5000.00"),
			RecurringIncomeCadence.MONTHLY,
			nextIncomeDate,
			active,
			"Primary job"
		);
		setId(entity, id);
		setTimestamps(entity);
		return entity;
	}

	private IncomeEntryResponse sampleIncomeEntryResponse() {
		return new IncomeEntryResponse(
			50L,
			"Salary",
			"Acme Corp",
			new BigDecimal("5000.00"),
			LocalDate.of(2026, 7, 15),
			null,
			Instant.parse("2026-07-15T00:00:00Z"),
			Instant.parse("2026-07-15T00:00:00Z"),
			null,
			null
		);
	}

	private static void setId(Object entity, Long id) throws Exception {
		Field field = entity.getClass().getDeclaredField("id");
		field.setAccessible(true);
		field.set(entity, id);
	}

	private static void setTimestamps(RecurringIncome entity) throws Exception {
		Field created = RecurringIncome.class.getDeclaredField("createdAt");
		created.setAccessible(true);
		created.set(entity, Instant.parse("2026-01-01T00:00:00Z"));
		Field updated = RecurringIncome.class.getDeclaredField("updatedAt");
		updated.setAccessible(true);
		updated.set(entity, Instant.parse("2026-01-01T00:00:00Z"));
	}

	private static void onCreate(Object entity) throws Exception {
		entity.getClass().getDeclaredMethod("onCreate").invoke(entity);
	}
}
