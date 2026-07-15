package com.ledgerbloom.recurring;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ledgerbloom.category.Category;
import com.ledgerbloom.category.CategoryNotFoundException;
import com.ledgerbloom.category.CategoryRepository;
import com.ledgerbloom.expense.ExpenseCreateRequest;
import com.ledgerbloom.expense.ExpenseResponse;
import com.ledgerbloom.expense.ExpenseService;
import com.ledgerbloom.expense.InvalidExpenseDataException;
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

	@Mock
	private RecurringExpenseRepository recurringExpenseRepository;

	@Mock
	private CategoryRepository categoryRepository;

	@Mock
	private ExpenseService expenseService;

	@InjectMocks
	private RecurringExpenseService recurringExpenseService;

	private Category groceries;

	@BeforeEach
	void setUp() throws Exception {
		groceries = new Category("Groceries", null);
		setId(groceries, 1L);
	}

	@Test
	void createValidRecurringExpense() throws Exception {
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(groceries));
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
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(groceries));
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
	void createRejectsBlankDescription() {
		assertThatThrownBy(() -> recurringExpenseService.create(createRequest(
			"   ",
			null,
			"10.00",
			1L,
			RecurringExpenseCadence.WEEKLY,
			LocalDate.of(2026, 8, 1),
			true,
			null
		))).isInstanceOf(InvalidRecurringExpenseDataException.class);
		verify(recurringExpenseRepository, never()).saveAndFlush(any());
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
		when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

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
		when(recurringExpenseRepository.findById(10L)).thenReturn(Optional.of(entity));
		when(recurringExpenseRepository.findById(99L)).thenReturn(Optional.empty());

		assertThat(recurringExpenseService.findById(10L).description()).isEqualTo("Netflix");
		assertThatThrownBy(() -> recurringExpenseService.findById(99L))
			.isInstanceOf(RecurringExpenseNotFoundException.class);
	}

	@Test
	void updateAndDelete() throws Exception {
		RecurringExpense entity = sampleEntity(10L, LocalDate.of(2026, 8, 1), true);
		when(recurringExpenseRepository.findById(10L)).thenReturn(Optional.of(entity));
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(groceries));
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
		when(recurringExpenseRepository.findFiltered(true, 1L, RecurringExpenseCadence.MONTHLY))
			.thenReturn(List.of());
		recurringExpenseService.findAll(true, 1L, "MONTHLY");
		verify(recurringExpenseRepository).findFiltered(true, 1L, RecurringExpenseCadence.MONTHLY);
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
		when(recurringExpenseRepository.findUpcoming(today, today.plusDays(30))).thenReturn(List.of());
		when(recurringExpenseRepository.findUpcoming(today, today.plusDays(7))).thenReturn(List.of());

		recurringExpenseService.findUpcoming(null);
		recurringExpenseService.findUpcoming(7);

		verify(recurringExpenseRepository).findUpcoming(today, today.plusDays(30));
		verify(recurringExpenseRepository).findUpcoming(today, today.plusDays(7));
	}

	@Test
	void upcomingRejectsNonPositiveDays() {
		assertThatThrownBy(() -> recurringExpenseService.findUpcoming(0))
			.isInstanceOf(InvalidRecurringExpenseFilterException.class);
	}

	@Test
	void cadenceAdvanceCalculations() {
		assertThat(RecurringExpenseService.advanceNextPaymentDate(LocalDate.of(2026, 7, 10), RecurringExpenseCadence.WEEKLY))
			.isEqualTo(LocalDate.of(2026, 7, 17));
		assertThat(RecurringExpenseService.advanceNextPaymentDate(LocalDate.of(2026, 7, 10), RecurringExpenseCadence.BIWEEKLY))
			.isEqualTo(LocalDate.of(2026, 7, 24));
		assertThat(RecurringExpenseService.advanceNextPaymentDate(LocalDate.of(2026, 1, 31), RecurringExpenseCadence.MONTHLY))
			.isEqualTo(LocalDate.of(2026, 2, 28));
		assertThat(RecurringExpenseService.advanceNextPaymentDate(LocalDate.of(2026, 1, 15), RecurringExpenseCadence.QUARTERLY))
			.isEqualTo(LocalDate.of(2026, 4, 15));
		assertThat(RecurringExpenseService.advanceNextPaymentDate(LocalDate.of(2026, 1, 15), RecurringExpenseCadence.SEMIANNUAL))
			.isEqualTo(LocalDate.of(2026, 7, 15));
		// Leap-day source uses LocalDate semantics: 2024-02-29 + 1 year => 2025-02-28
		assertThat(RecurringExpenseService.advanceNextPaymentDate(LocalDate.of(2024, 2, 29), RecurringExpenseCadence.ANNUAL))
			.isEqualTo(LocalDate.of(2025, 2, 28));
	}

	@Test
	void markPaidCreatesExpenseAndAdvancesDate() throws Exception {
		LocalDate next = LocalDate.of(2026, 7, 15);
		RecurringExpense entity = sampleEntity(10L, next, true);
		when(recurringExpenseRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(entity));
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
		assertThat(expenseRequest.notes()).contains("Paid from recurring expense #10");

		assertThat(response.updatedRecurringExpense().nextPaymentDate()).isEqualTo(LocalDate.of(2026, 8, 15));
		assertThat(response.createdExpense().id()).isEqualTo(50L);
	}

	@Test
	void markPaidRejectsStaleExpectedDate() throws Exception {
		RecurringExpense entity = sampleEntity(10L, LocalDate.of(2026, 8, 1), true);
		when(recurringExpenseRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(entity));

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
		when(recurringExpenseRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(entity));
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
		when(recurringExpenseRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(entity));
		when(expenseService.create(any(ExpenseCreateRequest.class)))
			.thenThrow(new InvalidExpenseDataException("Amount must be greater than zero"));

		assertThatThrownBy(() -> recurringExpenseService.markPaid(10L, new MarkPaidRequest(LocalDate.of(2026, 7, 15))))
			.isInstanceOf(InvalidExpenseDataException.class);

		assertThat(entity.getNextPaymentDate()).isEqualTo(LocalDate.of(2026, 7, 15));
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
		return new RecurringExpenseCreateRequest(
			description,
			merchant,
			new BigDecimal(amount),
			categoryId,
			cadence,
			nextPaymentDate,
			active,
			notes
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
			notes
		);
	}

	private RecurringExpense sampleEntity(Long id, LocalDate nextPaymentDate, boolean active) throws Exception {
		RecurringExpense entity = new RecurringExpense(
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
			new com.ledgerbloom.expense.ExpenseCategorySummary(1L, "Groceries"),
			"Paid from recurring expense #10",
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
