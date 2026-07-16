package com.ledgerbloom.recurring;

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
import com.ledgerbloom.category.Category;
import com.ledgerbloom.category.CategoryNotFoundException;
import com.ledgerbloom.category.CategoryRepository;
import com.ledgerbloom.expense.Expense;
import com.ledgerbloom.expense.ExpenseCreateRequest;
import com.ledgerbloom.expense.ExpenseRepository;
import com.ledgerbloom.expense.ExpenseResponse;
import com.ledgerbloom.expense.ExpenseService;
import com.ledgerbloom.expense.InvalidExpenseDataException;
import com.ledgerbloom.recurring.support.CadenceKind;
import com.ledgerbloom.recurring.support.CadenceScheduleMath;
import com.ledgerbloom.recurring.support.CatchUpRequest;
import com.ledgerbloom.recurring.support.HistorySetupMode;
import com.ledgerbloom.recurring.support.OccurrencePreviewRequest;
import com.ledgerbloom.recurring.support.OccurrencePreviewResponse;
import com.ledgerbloom.recurring.support.RecurringPeriodProjection;
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
class RecurringExpenseServiceTest {

	private static final Long USER_ID = 1L;

	@Mock
	private RecurringExpenseRepository recurringExpenseRepository;

	@Mock
	private RecurringExpenseOccurrenceRecordRepository occurrenceRecordRepository;

	@Mock
	private CategoryRepository categoryRepository;

	@Mock
	private ExpenseService expenseService;

	@Mock
	private ExpenseRepository expenseRepository;

	@Mock
	private com.ledgerbloom.budget.MonthlyBudgetService monthlyBudgetService;

	@Mock
	private CurrentUser currentUser;

	@InjectMocks
	private RecurringExpenseService recurringExpenseService;

	private User user;
	private Category groceries;

	@BeforeEach
	void setUp() throws Exception {
		user = new User("user@example.com", "hash", "Test User");
		setId(user, USER_ID);
		lenient().when(currentUser.requireUserId()).thenReturn(USER_ID);
		lenient().when(currentUser.requireUserReference()).thenReturn(user);

		groceries = new Category(user, "Groceries", null);
		setId(groceries, 1L);
	}

	@Test
	void createValidRecurringExpense() throws Exception {
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(groceries));
		when(recurringExpenseRepository.saveAndFlush(any(RecurringExpense.class))).thenAnswer(invocation -> {
			RecurringExpense entity = invocation.getArgument(0);
			setId(entity, 10L);
			onCreate(entity);
			return entity;
		});

		RecurringExpenseResponse response = recurringExpenseService.create(createRequest(
			"Netflix",
			"Netflix Inc",
			"15.99",
			1L,
			RecurringExpenseCadence.MONTHLY,
			LocalDate.of(2026, 8, 1),
			true,
			"Family plan"
		));

		assertThat(response.id()).isEqualTo(10L);
		assertThat(response.description()).isEqualTo("Netflix");
		assertThat(response.merchant()).isEqualTo("Netflix Inc");
		assertThat(response.amount()).isEqualByComparingTo("15.99");
		assertThat(response.cadence()).isEqualTo(RecurringExpenseCadence.MONTHLY);
		assertThat(response.active()).isTrue();
		assertThat(response.notes()).isEqualTo("Family plan");
	}

	@Test
	void createNormalizesMerchantAndNotes() throws Exception {
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(groceries));
		when(recurringExpenseRepository.saveAndFlush(any(RecurringExpense.class))).thenAnswer(invocation -> {
			RecurringExpense entity = invocation.getArgument(0);
			setId(entity, 11L);
			onCreate(entity);
			return entity;
		});

		recurringExpenseService.create(createRequest(
			"  Spotify  ",
			"  ",
			"10.00",
			1L,
			RecurringExpenseCadence.MONTHLY,
			LocalDate.of(2026, 8, 1),
			true,
			"   "
		));

		ArgumentCaptor<RecurringExpense> captor = ArgumentCaptor.forClass(RecurringExpense.class);
		verify(recurringExpenseRepository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getDescription()).isEqualTo("Spotify");
		assertThat(captor.getValue().getMerchant()).isNull();
		assertThat(captor.getValue().getNotes()).isNull();
	}

	@Test
	void createConvertsBlankDescriptionToNull() throws Exception {
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(groceries));
		when(recurringExpenseRepository.saveAndFlush(any(RecurringExpense.class))).thenAnswer(invocation -> {
			RecurringExpense expense = invocation.getArgument(0);
			setId(expense, 12L);
			onCreate(expense);
			return expense;
		});

		RecurringExpenseResponse response = recurringExpenseService.create(createRequest(
			"   ",
			null,
			"10.00",
			1L,
			RecurringExpenseCadence.WEEKLY,
			LocalDate.of(2026, 8, 1),
			true,
			null
		));

		assertThat(response.description()).isNull();
		ArgumentCaptor<RecurringExpense> captor = ArgumentCaptor.forClass(RecurringExpense.class);
		verify(recurringExpenseRepository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getDescription()).isNull();
	}

	@Test
	void createRejectsInvalidAmount() {
		assertThatThrownBy(() -> recurringExpenseService.create(createRequest(
			"Gym",
			null,
			"0",
			1L,
			RecurringExpenseCadence.MONTHLY,
			LocalDate.of(2026, 8, 1),
			true,
			null
		))).isInstanceOf(InvalidRecurringExpenseDataException.class);
	}

	@Test
	void createRejectsMissingCategory() {
		when(categoryRepository.findByIdAndUser_Id(99L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> recurringExpenseService.create(createRequest(
			"Gym",
			null,
			"40.00",
			99L,
			RecurringExpenseCadence.MONTHLY,
			LocalDate.of(2026, 8, 1),
			true,
			null
		))).isInstanceOf(CategoryNotFoundException.class);
	}

	@Test
	void getByIdAndMissing() throws Exception {
		RecurringExpense entity = sampleEntity(10L, LocalDate.of(2026, 8, 1), true);
		when(recurringExpenseRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(recurringExpenseRepository.findByIdAndUser_Id(99L, USER_ID)).thenReturn(Optional.empty());

		assertThat(recurringExpenseService.findById(10L).description()).isEqualTo("Netflix");
		assertThatThrownBy(() -> recurringExpenseService.findById(99L))
			.isInstanceOf(RecurringExpenseNotFoundException.class);
	}

	@Test
	void updateAndDelete() throws Exception {
		RecurringExpense entity = sampleEntity(10L, LocalDate.of(2026, 8, 1), true);
		when(recurringExpenseRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(groceries));
		when(recurringExpenseRepository.saveAndFlush(any(RecurringExpense.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));

		RecurringExpenseResponse updated = recurringExpenseService.update(10L, updateRequest(
			"Netflix Plus",
			null,
			"17.99",
			1L,
			RecurringExpenseCadence.MONTHLY,
			LocalDate.of(2026, 9, 1),
			false,
			null
		));
		assertThat(updated.description()).isEqualTo("Netflix Plus");
		assertThat(updated.active()).isFalse();

		recurringExpenseService.delete(10L);
		verify(recurringExpenseRepository).delete(entity);
	}

	@Test
	void filtersForwardToRepository() {
		when(recurringExpenseRepository.findFiltered(USER_ID, true, 1L, RecurringExpenseCadence.MONTHLY))
			.thenReturn(List.of());
		recurringExpenseService.findAll(true, 1L, "MONTHLY");
		verify(recurringExpenseRepository).findFiltered(USER_ID, true, 1L, RecurringExpenseCadence.MONTHLY);
	}

	@Test
	void filterRejectsInvalidCadenceAndCategory() {
		assertThatThrownBy(() -> recurringExpenseService.findAll(null, null, "DAILY"))
			.isInstanceOf(InvalidRecurringExpenseFilterException.class);
		assertThatThrownBy(() -> recurringExpenseService.findAll(null, 0L, null))
			.isInstanceOf(InvalidRecurringExpenseFilterException.class);
	}

	@Test
	void upcomingDefaultAndCustomDays() {
		LocalDate today = LocalDate.now();
		when(recurringExpenseRepository.findActiveDueOnOrBefore(USER_ID, today.plusDays(30))).thenReturn(List.of());
		when(recurringExpenseRepository.findActiveDueOnOrBefore(USER_ID, today.plusDays(7))).thenReturn(List.of());

		recurringExpenseService.findUpcoming(null);
		recurringExpenseService.findUpcoming(7);

		verify(recurringExpenseRepository).findActiveDueOnOrBefore(USER_ID, today.plusDays(30));
		verify(recurringExpenseRepository).findActiveDueOnOrBefore(USER_ID, today.plusDays(7));
	}

	@Test
	void upcomingExpandsWeeklyIntoEachOccurrence() throws Exception {
		LocalDate today = LocalDate.now();
		LocalDate toInclusive = today.plusDays(30);
		RecurringExpense weekly = new RecurringExpense(
			user,
			"Allowance",
			null,
			new BigDecimal("50.00"),
			groceries,
			RecurringExpenseCadence.WEEKLY,
			today,
			true,
			null
		);
		setId(weekly, 42L);
		setTimestamps(weekly);
		when(recurringExpenseRepository.findActiveDueOnOrBefore(USER_ID, toInclusive))
			.thenReturn(List.of(weekly));

		List<RecurringExpenseResponse> upcoming = recurringExpenseService.findUpcoming(30);

		List<LocalDate> expectedDates = RecurringPeriodProjection.expenseDatesInPeriod(
			weekly, today, toInclusive);
		assertThat(upcoming).hasSize(expectedDates.size());
		assertThat(upcoming.stream().map(RecurringExpenseResponse::nextPaymentDate).toList())
			.containsExactlyElementsOf(expectedDates);
		assertThat(upcoming).allMatch(row -> row.id().equals(42L));
		assertThat(upcoming).allMatch(row -> row.amount().compareTo(new BigDecimal("50.00")) == 0);
		assertThat(expectedDates.size()).isGreaterThanOrEqualTo(4);
	}

	@Test
	void upcomingRejectsNonPositiveDays() {
		assertThatThrownBy(() -> recurringExpenseService.findUpcoming(0))
			.isInstanceOf(InvalidRecurringExpenseFilterException.class);
	}

	@Test
	void cadenceAdvanceCalculations() {
		assertThat(RecurringExpenseService.advanceNextPaymentDate(
			LocalDate.of(2026, 7, 10), RecurringExpenseCadence.WEEKLY, null, null))
			.isEqualTo(LocalDate.of(2026, 7, 17));
		assertThat(RecurringExpenseService.advanceNextPaymentDate(
			LocalDate.of(2026, 7, 10), RecurringExpenseCadence.BIWEEKLY, null, null))
			.isEqualTo(LocalDate.of(2026, 7, 24));
		assertThat(RecurringExpenseService.advanceNextPaymentDate(
			LocalDate.of(2026, 1, 31), RecurringExpenseCadence.MONTHLY, null, null))
			.isEqualTo(LocalDate.of(2026, 2, 28));
		assertThat(RecurringExpenseService.advanceNextPaymentDate(
			LocalDate.of(2026, 1, 15), RecurringExpenseCadence.QUARTERLY, null, null))
			.isEqualTo(LocalDate.of(2026, 4, 15));
		assertThat(RecurringExpenseService.advanceNextPaymentDate(
			LocalDate.of(2026, 1, 15), RecurringExpenseCadence.SEMIANNUAL, null, null))
			.isEqualTo(LocalDate.of(2026, 7, 15));
		// Leap-day source uses LocalDate semantics: 2024-02-29 + 1 year => 2025-02-28
		assertThat(RecurringExpenseService.advanceNextPaymentDate(
			LocalDate.of(2024, 2, 29), RecurringExpenseCadence.ANNUAL, null, null))
			.isEqualTo(LocalDate.of(2025, 2, 28));
		assertThat(RecurringExpenseService.advanceNextPaymentDate(
			LocalDate.of(2026, 7, 1), RecurringExpenseCadence.SEMIMONTHLY, 1, 15))
			.isEqualTo(LocalDate.of(2026, 7, 15));
		assertThat(RecurringExpenseService.advanceNextPaymentDate(
			LocalDate.of(2026, 7, 15), RecurringExpenseCadence.SEMIMONTHLY, 1, 15))
			.isEqualTo(LocalDate.of(2026, 8, 1));
	}

	@Test
	void markPaidCreatesExpenseAndAdvancesDate() throws Exception {
		LocalDate next = LocalDate.of(2026, 7, 15);
		RecurringExpense entity = sampleEntity(10L, next, true);
		when(recurringExpenseRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(expenseService.create(any(ExpenseCreateRequest.class))).thenReturn(sampleExpenseResponse());
		when(recurringExpenseRepository.saveAndFlush(any(RecurringExpense.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));

		MarkPaidResponse response = recurringExpenseService.markPaid(
			10L,
			new MarkPaidRequest(next)
		);

		ArgumentCaptor<ExpenseCreateRequest> expenseCaptor = ArgumentCaptor.forClass(ExpenseCreateRequest.class);
		verify(expenseService).create(expenseCaptor.capture());
		ExpenseCreateRequest expenseRequest = expenseCaptor.getValue();
		assertThat(expenseRequest.description()).isEqualTo("Netflix");
		assertThat(expenseRequest.amount()).isEqualByComparingTo("15.99");
		assertThat(expenseRequest.expenseDate()).isEqualTo(next);
		assertThat(expenseRequest.categoryId()).isEqualTo(1L);
		assertThat(expenseRequest.notes()).isNull();

		assertThat(response.updatedRecurringExpense().nextPaymentDate()).isEqualTo(LocalDate.of(2026, 8, 15));
		assertThat(response.createdExpense().id()).isEqualTo(50L);
	}

	@Test
	void markPaidRejectsStaleExpectedDate() throws Exception {
		RecurringExpense entity = sampleEntity(10L, LocalDate.of(2026, 8, 1), true);
		when(recurringExpenseRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));

		assertThatThrownBy(() -> recurringExpenseService.markPaid(
			10L,
			new MarkPaidRequest(LocalDate.of(2026, 7, 1))
		)).isInstanceOf(RecurringExpensePaymentConflictException.class);

		verify(expenseService, never()).create(any());
		verify(recurringExpenseRepository, never()).saveAndFlush(any());
	}

	@Test
	void markPaidRepeatedOriginalExpectedDateDoesNotCreateSecondExpense() throws Exception {
		LocalDate original = LocalDate.of(2026, 7, 15);
		RecurringExpense entity = sampleEntity(10L, original, true);
		when(recurringExpenseRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(expenseService.create(any(ExpenseCreateRequest.class))).thenReturn(sampleExpenseResponse());
		when(recurringExpenseRepository.saveAndFlush(any(RecurringExpense.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));

		recurringExpenseService.markPaid(10L, new MarkPaidRequest(original));
		assertThat(entity.getNextPaymentDate()).isEqualTo(LocalDate.of(2026, 8, 15));

		assertThatThrownBy(() -> recurringExpenseService.markPaid(10L, new MarkPaidRequest(original)))
			.isInstanceOf(RecurringExpensePaymentConflictException.class);

		verify(expenseService).create(any(ExpenseCreateRequest.class));
		assertThat(entity.getNextPaymentDate()).isEqualTo(LocalDate.of(2026, 8, 15));
	}

	@Test
	void markPaidRollsBackWhenExpenseCreateFails() throws Exception {
		RecurringExpense entity = sampleEntity(10L, LocalDate.of(2026, 7, 15), true);
		when(recurringExpenseRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(expenseService.create(any(ExpenseCreateRequest.class)))
			.thenThrow(new InvalidExpenseDataException("Amount must be greater than zero"));

		assertThatThrownBy(() -> recurringExpenseService.markPaid(10L, new MarkPaidRequest(LocalDate.of(2026, 7, 15))))
			.isInstanceOf(InvalidExpenseDataException.class);

		assertThat(entity.getNextPaymentDate()).isEqualTo(LocalDate.of(2026, 7, 15));
		verify(recurringExpenseRepository, never()).saveAndFlush(any());
	}

	@Test
	void createRejectsSemimonthlyWithoutPaymentDays() {
		assertThatThrownBy(() -> recurringExpenseService.create(createRequest(
			"Netflix", "Netflix Inc", "15.99", 1L, RecurringExpenseCadence.SEMIMONTHLY,
			LocalDate.now().plusMonths(1), true, null, null, null, null, null
		))).isInstanceOf(InvalidRecurringExpenseDataException.class);
		verify(recurringExpenseRepository, never()).saveAndFlush(any());
	}

	@Test
	void createRejectsPaymentDaysForNonSemimonthlyCadence() {
		assertThatThrownBy(() -> recurringExpenseService.create(createRequest(
			"Netflix", "Netflix Inc", "15.99", 1L, RecurringExpenseCadence.MONTHLY,
			LocalDate.now().plusMonths(1), true, null, 1, 15, null, null
		))).isInstanceOf(InvalidRecurringExpenseDataException.class);
	}

	@Test
	void createNormalizesSemimonthlyDaysToAscendingOrder() throws Exception {
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(groceries));
		when(recurringExpenseRepository.saveAndFlush(any(RecurringExpense.class))).thenAnswer(invocation -> {
			RecurringExpense entity = invocation.getArgument(0);
			setId(entity, 22L);
			onCreate(entity);
			return entity;
		});

		RecurringExpenseResponse response = recurringExpenseService.create(createRequest(
			"Netflix", "Netflix Inc", "15.99", 1L, RecurringExpenseCadence.SEMIMONTHLY,
			LocalDate.now().plusMonths(1), true, null, 15, 1, null, null
		));

		assertThat(response.firstPaymentDay()).isEqualTo(1);
		assertThat(response.secondPaymentDay()).isEqualTo(15);
	}

	@Test
	void createWithPastStartDateDefaultsToTrackFromNowAndSkipsEntryCreation() throws Exception {
		LocalDate today = LocalDate.now();
		LocalDate start = today.minusMonths(3);
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(groceries));
		when(recurringExpenseRepository.saveAndFlush(any(RecurringExpense.class))).thenAnswer(invocation -> {
			RecurringExpense entity = invocation.getArgument(0);
			setId(entity, 20L);
			onCreate(entity);
			return entity;
		});

		RecurringExpenseResponse response = recurringExpenseService.create(createRequest(
			"Netflix", "Netflix Inc", "15.99", 1L, RecurringExpenseCadence.MONTHLY, start, true, null,
			null, null, null, null
		));

		LocalDate expectedNext = CadenceScheduleMath.firstOnOrAfter(start, today, CadenceKind.MONTHLY, null, null);
		assertThat(response.nextPaymentDate()).isEqualTo(expectedNext);
		verify(expenseService, never()).create(any());
		verify(occurrenceRecordRepository, never()).saveAndFlush(any());
	}

	@Test
	void createWithPastStartDateRecordSelectedCreatesEntriesForSelectedDatesOnly() throws Exception {
		LocalDate today = LocalDate.now();
		LocalDate start = today.minusMonths(3);
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(groceries));
		when(recurringExpenseRepository.saveAndFlush(any(RecurringExpense.class))).thenAnswer(invocation -> {
			RecurringExpense entity = invocation.getArgument(0);
			setId(entity, 21L);
			onCreate(entity);
			return entity;
		});
		when(expenseService.create(any(ExpenseCreateRequest.class))).thenAnswer(invocation -> sampleExpenseResponse());
		when(expenseRepository.getReferenceById(anyLong())).thenReturn(mock(Expense.class));

		List<LocalDate> preview = CadenceScheduleMath.occurrencesThrough(start, today, CadenceKind.MONTHLY, null, null);
		List<LocalDate> selected = List.of(preview.get(0), preview.get(preview.size() - 1));

		RecurringExpenseResponse response = recurringExpenseService.create(createRequest(
			"Netflix", "Netflix Inc", "15.99", 1L, RecurringExpenseCadence.MONTHLY, start, true, null,
			null, null, HistorySetupMode.RECORD_SELECTED, selected
		));

		LocalDate expectedNext = CadenceScheduleMath.advance(
			preview.get(preview.size() - 1), CadenceKind.MONTHLY, null, null);
		assertThat(response.nextPaymentDate()).isEqualTo(expectedNext);
		verify(expenseService, times(2)).create(any(ExpenseCreateRequest.class));
		verify(occurrenceRecordRepository, times(2)).saveAndFlush(any());
	}

	@Test
	void createRejectsSelectedDatesNotInPreview() {
		LocalDate today = LocalDate.now();
		LocalDate start = today.minusMonths(3);
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(groceries));
		assertThatThrownBy(() -> recurringExpenseService.create(createRequest(
			"Netflix", "Netflix Inc", "15.99", 1L, RecurringExpenseCadence.MONTHLY, start, true, null,
			null, null, HistorySetupMode.RECORD_SELECTED, List.of(today.plusDays(100))
		))).isInstanceOf(InvalidRecurringExpenseDataException.class);
	}

	@Test
	void previewOccurrencesReturnsDatesThroughTodayAndSuggestedNext() {
		LocalDate today = LocalDate.now();
		LocalDate start = today.minusMonths(2);

		OccurrencePreviewResponse response = recurringExpenseService.previewOccurrences(
			new OccurrencePreviewRequest(CadenceKind.MONTHLY, start, new BigDecimal("15.99"), null, null)
		);

		List<LocalDate> expectedDates = CadenceScheduleMath.occurrencesThrough(start, today, CadenceKind.MONTHLY, null, null);
		assertThat(response.occurrences()).hasSize(expectedDates.size());
		assertThat(response.occurrences().get(0).occurrenceDate()).isEqualTo(expectedDates.get(0));
		assertThat(response.suggestedNextOnOrAfterToday())
			.isEqualTo(CadenceScheduleMath.firstOnOrAfter(start, today, CadenceKind.MONTHLY, null, null));
	}

	@Test
	void previewOccurrencesFutureStartReturnsEmptyListAndSuggestedNextEqualsStart() {
		LocalDate start = LocalDate.now().plusMonths(1);

		OccurrencePreviewResponse response = recurringExpenseService.previewOccurrences(
			new OccurrencePreviewRequest(CadenceKind.MONTHLY, start, new BigDecimal("15.99"), null, null)
		);

		assertThat(response.occurrences()).isEmpty();
		assertThat(response.suggestedNextOnOrAfterToday()).isEqualTo(start);
	}

	@Test
	void catchUpCreatesEntriesForSelectedDatesAndAdvancesPastAllAllowedDates() throws Exception {
		LocalDate today = LocalDate.now();
		LocalDate next = today.minusMonths(3);
		RecurringExpense entity = sampleEntity(10L, next, true);
		when(recurringExpenseRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(recurringExpenseRepository.saveAndFlush(any(RecurringExpense.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));
		when(expenseService.create(any(ExpenseCreateRequest.class))).thenAnswer(invocation -> sampleExpenseResponse());
		when(expenseRepository.getReferenceById(anyLong())).thenReturn(mock(Expense.class));

		List<LocalDate> allowed = CadenceScheduleMath.occurrencesThrough(next, today, CadenceKind.MONTHLY, null, null);
		LocalDate expectedNext = CadenceScheduleMath.advance(allowed.get(allowed.size() - 1), CadenceKind.MONTHLY, null, null);
		List<LocalDate> selected = List.of(allowed.get(0), allowed.get(allowed.size() - 1));

		RecurringExpenseCatchUpResponse response = recurringExpenseService.catchUp(10L, new CatchUpRequest(selected));

		assertThat(response.createdCount()).isEqualTo(2);
		assertThat(response.createdDates()).containsExactlyElementsOf(selected.stream().sorted().toList());
		assertThat(response.nextOccurrenceDate()).isEqualTo(expectedNext);
		assertThat(response.updatedRecurringExpense().nextPaymentDate()).isEqualTo(expectedNext);
		verify(expenseService, times(2)).create(any(ExpenseCreateRequest.class));
	}

	@Test
	void catchUpSkipsDatesThatAlreadyHaveOccurrenceRecords() throws Exception {
		LocalDate today = LocalDate.now();
		LocalDate next = today.minusMonths(1);
		RecurringExpense entity = sampleEntity(10L, next, true);
		when(recurringExpenseRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(recurringExpenseRepository.saveAndFlush(any(RecurringExpense.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));
		when(occurrenceRecordRepository.existsByRecurringExpense_IdAndOccurrenceDate(10L, next)).thenReturn(true);

		List<LocalDate> allowed = CadenceScheduleMath.occurrencesThrough(next, today, CadenceKind.MONTHLY, null, null);
		LocalDate expectedNext = CadenceScheduleMath.advance(allowed.get(allowed.size() - 1), CadenceKind.MONTHLY, null, null);

		RecurringExpenseCatchUpResponse response = recurringExpenseService.catchUp(10L, new CatchUpRequest(List.of(next)));

		assertThat(response.createdCount()).isEqualTo(0);
		assertThat(response.createdDates()).isEmpty();
		assertThat(response.nextOccurrenceDate()).isEqualTo(expectedNext);
		verify(expenseService, never()).create(any());
	}

	@Test
	void catchUpIdempotentRetryAfterAdvanceReturnsZeroWithoutCreatingEntries() throws Exception {
		LocalDate today = LocalDate.now();
		LocalDate alreadyRecorded = today.minusMonths(1);
		LocalDate nextAfterCatchUp = today.plusDays(1);
		RecurringExpense entity = sampleEntity(10L, nextAfterCatchUp, true);
		when(recurringExpenseRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(recurringExpenseRepository.saveAndFlush(any(RecurringExpense.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));
		when(occurrenceRecordRepository.existsByRecurringExpense_IdAndOccurrenceDate(10L, alreadyRecorded))
			.thenReturn(true);

		RecurringExpenseCatchUpResponse response = recurringExpenseService.catchUp(
			10L, new CatchUpRequest(List.of(alreadyRecorded)));

		assertThat(response.createdCount()).isEqualTo(0);
		assertThat(response.createdDates()).isEmpty();
		assertThat(response.nextOccurrenceDate()).isEqualTo(nextAfterCatchUp);
		verify(expenseService, never()).create(any());
	}

	@Test
	void catchUpRejectsDateOutsideAllowedRange() throws Exception {
		LocalDate today = LocalDate.now();
		LocalDate next = today.minusMonths(1);
		RecurringExpense entity = sampleEntity(10L, next, true);
		when(recurringExpenseRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));

		assertThatThrownBy(() -> recurringExpenseService.catchUp(10L, new CatchUpRequest(List.of(today.plusDays(30)))))
			.isInstanceOf(InvalidRecurringExpenseDataException.class);
		verify(expenseService, never()).create(any());
	}

	@Test
	void markPaidWritesOccurrenceRecordLinkedToCreatedExpense() throws Exception {
		LocalDate next = LocalDate.of(2026, 7, 15);
		RecurringExpense entity = sampleEntity(10L, next, true);
		when(recurringExpenseRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(expenseService.create(any(ExpenseCreateRequest.class))).thenReturn(sampleExpenseResponse());
		when(recurringExpenseRepository.saveAndFlush(any(RecurringExpense.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));
		Expense expenseRef = mock(Expense.class);
		when(expenseRepository.getReferenceById(50L)).thenReturn(expenseRef);

		recurringExpenseService.markPaid(10L, new MarkPaidRequest(next));

		ArgumentCaptor<RecurringExpenseOccurrenceRecord> captor = ArgumentCaptor.forClass(RecurringExpenseOccurrenceRecord.class);
		verify(occurrenceRecordRepository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getOccurrenceDate()).isEqualTo(next);
		assertThat(captor.getValue().getExpense()).isEqualTo(expenseRef);
	}

	@Test
	void markPaidThrowsConflictWhenOccurrenceRecordAlreadyExists() throws Exception {
		LocalDate next = LocalDate.of(2026, 7, 15);
		RecurringExpense entity = sampleEntity(10L, next, true);
		when(recurringExpenseRepository.findByIdAndUser_IdForUpdate(10L, USER_ID)).thenReturn(Optional.of(entity));
		when(occurrenceRecordRepository.existsByRecurringExpense_IdAndOccurrenceDate(10L, next)).thenReturn(true);

		assertThatThrownBy(() -> recurringExpenseService.markPaid(10L, new MarkPaidRequest(next)))
			.isInstanceOf(RecurringExpensePaymentConflictException.class);

		verify(expenseService, never()).create(any());
		verify(recurringExpenseRepository, never()).saveAndFlush(any());
	}

	private RecurringExpenseCreateRequest createRequest(
			String description,
			String merchant,
			String amount,
			Long categoryId,
			RecurringExpenseCadence cadence,
			LocalDate nextPaymentDate,
			boolean active,
			String notes) {
		return createRequest(
			description, merchant, amount, categoryId, cadence, nextPaymentDate, active, notes, null, null, null, null);
	}

	private RecurringExpenseCreateRequest createRequest(
			String description,
			String merchant,
			String amount,
			Long categoryId,
			RecurringExpenseCadence cadence,
			LocalDate nextPaymentDate,
			boolean active,
			String notes,
			Integer firstPaymentDay,
			Integer secondPaymentDay,
			HistorySetupMode historyMode,
			List<LocalDate> selectedOccurrenceDates) {
		return new RecurringExpenseCreateRequest(
			description,
			merchant,
			new BigDecimal(amount),
			categoryId,
			cadence,
			nextPaymentDate,
			active,
			notes,
			firstPaymentDay,
			secondPaymentDay,
			historyMode,
			selectedOccurrenceDates
		);
	}

	private RecurringExpenseUpdateRequest updateRequest(
			String description,
			String merchant,
			String amount,
			Long categoryId,
			RecurringExpenseCadence cadence,
			LocalDate nextPaymentDate,
			boolean active,
			String notes) {
		return new RecurringExpenseUpdateRequest(
			description,
			merchant,
			new BigDecimal(amount),
			categoryId,
			cadence,
			nextPaymentDate,
			active,
			notes,
			null,
			null
		);
	}

	private RecurringExpense sampleEntity(Long id, LocalDate nextPaymentDate, boolean active) throws Exception {
		RecurringExpense entity = new RecurringExpense(
			user,
			"Netflix",
			"Netflix Inc",
			new BigDecimal("15.99"),
			groceries,
			RecurringExpenseCadence.MONTHLY,
			nextPaymentDate,
			active,
			"Family plan"
		);
		setId(entity, id);
		setTimestamps(entity);
		return entity;
	}

	private ExpenseResponse sampleExpenseResponse() {
		return new ExpenseResponse(
			50L,
			"Netflix",
			"Netflix Inc",
			new BigDecimal("15.99"),
			LocalDate.of(2026, 7, 15),
			new com.ledgerbloom.expense.ExpenseCategorySummary(1L, "Groceries", null),
			null,
			Instant.parse("2026-07-15T00:00:00Z"),
			Instant.parse("2026-07-15T00:00:00Z")
		);
	}

	private static void setId(Object entity, Long id) throws Exception {
		Field field = entity.getClass().getDeclaredField("id");
		field.setAccessible(true);
		field.set(entity, id);
	}

	private static void setTimestamps(RecurringExpense entity) throws Exception {
		Field created = RecurringExpense.class.getDeclaredField("createdAt");
		created.setAccessible(true);
		created.set(entity, Instant.parse("2026-01-01T00:00:00Z"));
		Field updated = RecurringExpense.class.getDeclaredField("updatedAt");
		updated.setAccessible(true);
		updated.set(entity, Instant.parse("2026-01-01T00:00:00Z"));
	}

	private static void onCreate(Object entity) throws Exception {
		entity.getClass().getDeclaredMethod("onCreate").invoke(entity);
	}
}
