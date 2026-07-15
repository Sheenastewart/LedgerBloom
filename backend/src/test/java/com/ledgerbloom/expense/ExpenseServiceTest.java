package com.ledgerbloom.expense;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ledgerbloom.category.Category;
import com.ledgerbloom.category.CategoryNotFoundException;
import com.ledgerbloom.category.CategoryRepository;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.sql.SQLException;
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
import org.springframework.dao.DataIntegrityViolationException;

@ExtendWith(MockitoExtension.class)
class ExpenseServiceTest {

	@Mock
	private ExpenseRepository expenseRepository;

	@Mock
	private CategoryRepository categoryRepository;

	@InjectMocks
	private ExpenseService expenseService;

	private Category groceries;
	private Category utilities;

	@BeforeEach
	void setUp() throws Exception {
		groceries = new Category("Groceries", null);
		setId(groceries, 1L);
		utilities = new Category("Utilities", null);
		setId(utilities, 2L);
	}

	@Test
	void createValidExpense() throws Exception {
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(groceries));
		when(expenseRepository.saveAndFlush(any(Expense.class))).thenAnswer(invocation -> {
			Expense expense = invocation.getArgument(0);
			setId(expense, 10L);
			expense.onCreate();
			return expense;
		});

		ExpenseResponse response = expenseService.create(new ExpenseCreateRequest(
			"Weekly shopping",
			"Market",
			new BigDecimal("45.50"),
			LocalDate.of(2026, 7, 10),
			1L,
			"Note"
		));

		assertThat(response.id()).isEqualTo(10L);
		assertThat(response.description()).isEqualTo("Weekly shopping");
		assertThat(response.merchant()).isEqualTo("Market");
		assertThat(response.amount()).isEqualByComparingTo("45.50");
		assertThat(response.category().id()).isEqualTo(1L);
		assertThat(response.category().name()).isEqualTo("Groceries");
		assertThat(response.notes()).isEqualTo("Note");
	}

	@Test
	void createTrimsDescription() throws Exception {
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(groceries));
		when(expenseRepository.saveAndFlush(any(Expense.class))).thenAnswer(invocation -> {
			Expense expense = invocation.getArgument(0);
			setId(expense, 11L);
			expense.onCreate();
			return expense;
		});

		expenseService.create(new ExpenseCreateRequest(
			"  Weekly shopping  ",
			null,
			new BigDecimal("10.00"),
			LocalDate.of(2026, 7, 1),
			1L,
			null
		));

		ArgumentCaptor<Expense> captor = ArgumentCaptor.forClass(Expense.class);
		verify(expenseRepository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getDescription()).isEqualTo("Weekly shopping");
	}

	@Test
	void createConvertsBlankMerchantToNull() throws Exception {
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(groceries));
		when(expenseRepository.saveAndFlush(any(Expense.class))).thenAnswer(invocation -> {
			Expense expense = invocation.getArgument(0);
			setId(expense, 12L);
			expense.onCreate();
			return expense;
		});

		ExpenseResponse response = expenseService.create(new ExpenseCreateRequest(
			"Milk",
			"   ",
			new BigDecimal("3.00"),
			LocalDate.of(2026, 7, 1),
			1L,
			null
		));

		assertThat(response.merchant()).isNull();
	}

	@Test
	void createConvertsBlankNotesToNull() throws Exception {
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(groceries));
		when(expenseRepository.saveAndFlush(any(Expense.class))).thenAnswer(invocation -> {
			Expense expense = invocation.getArgument(0);
			setId(expense, 13L);
			expense.onCreate();
			return expense;
		});

		ExpenseResponse response = expenseService.create(new ExpenseCreateRequest(
			"Milk",
			null,
			new BigDecimal("3.00"),
			LocalDate.of(2026, 7, 1),
			1L,
			"  "
		));

		assertThat(response.notes()).isNull();
	}

	@Test
	void createRejectsNonPositiveAmount() {
		assertThatThrownBy(() -> expenseService.create(new ExpenseCreateRequest(
			"Milk",
			null,
			BigDecimal.ZERO,
			LocalDate.of(2026, 7, 1),
			1L,
			null
		))).isInstanceOf(InvalidExpenseDataException.class);

		verify(expenseRepository, never()).saveAndFlush(any());
	}

	@Test
	void createRejectsAmountWithMoreThanTwoDecimals() {
		assertThatThrownBy(() -> expenseService.create(new ExpenseCreateRequest(
			"Milk",
			null,
			new BigDecimal("1.234"),
			LocalDate.of(2026, 7, 1),
			1L,
			null
		))).isInstanceOf(InvalidExpenseDataException.class);
	}

	@Test
	void createRejectsAmountExceedingNumericLimit() {
		assertThatThrownBy(() -> expenseService.create(new ExpenseCreateRequest(
			"Milk",
			null,
			new BigDecimal("10000000000.00"),
			LocalDate.of(2026, 7, 1),
			1L,
			null
		))).isInstanceOf(InvalidExpenseDataException.class);
	}

	@Test
	void createRejectsMissingCategory() {
		when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> expenseService.create(new ExpenseCreateRequest(
			"Milk",
			null,
			new BigDecimal("1.00"),
			LocalDate.of(2026, 7, 1),
			99L,
			null
		))).isInstanceOf(CategoryNotFoundException.class);

		verify(expenseRepository, never()).saveAndFlush(any());
	}

	@Test
	void createMapsForeignKeyRaceToCategoryNotFound() {
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(groceries));
		when(expenseRepository.saveAndFlush(any(Expense.class)))
			.thenThrow(new DataIntegrityViolationException(
				"fk",
				new SQLException("foreign key violation", "23503", 0)
			));

		assertThatThrownBy(() -> expenseService.create(new ExpenseCreateRequest(
			"Milk",
			null,
			new BigDecimal("1.00"),
			LocalDate.of(2026, 7, 1),
			1L,
			null
		))).isInstanceOf(CategoryNotFoundException.class);
	}

	@Test
	void createRethrowsUnknownIntegrityViolation() {
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(groceries));
		when(expenseRepository.saveAndFlush(any(Expense.class)))
			.thenThrow(new DataIntegrityViolationException(
				"check",
				new SQLException("check violation", "23514", 0)
			));

		assertThatThrownBy(() -> expenseService.create(new ExpenseCreateRequest(
			"Milk",
			null,
			new BigDecimal("1.00"),
			LocalDate.of(2026, 7, 1),
			1L,
			null
		))).isInstanceOf(DataIntegrityViolationException.class)
			.isNotInstanceOf(CategoryNotFoundException.class);
	}

	@Test
	void getExpenseById() throws Exception {
		Expense expense = sampleExpense(5L, groceries, LocalDate.of(2026, 7, 5));
		when(expenseRepository.findById(5L)).thenReturn(Optional.of(expense));

		ExpenseResponse response = expenseService.findById(5L);

		assertThat(response.id()).isEqualTo(5L);
		assertThat(response.category().name()).isEqualTo("Groceries");
	}

	@Test
	void getMissingExpenseThrows() {
		when(expenseRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> expenseService.findById(99L))
			.isInstanceOf(ExpenseNotFoundException.class);
	}

	@Test
	void updateValidExpense() throws Exception {
		Expense expense = sampleExpense(5L, groceries, LocalDate.of(2026, 7, 5));
		when(expenseRepository.findById(5L)).thenReturn(Optional.of(expense));
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(groceries));
		when(expenseRepository.saveAndFlush(any(Expense.class))).thenAnswer(invocation -> invocation.getArgument(0));

		ExpenseResponse response = expenseService.update(5L, new ExpenseUpdateRequest(
			"Updated",
			"Store",
			new BigDecimal("12.00"),
			LocalDate.of(2026, 7, 6),
			1L,
			"changed"
		));

		assertThat(response.description()).isEqualTo("Updated");
		assertThat(response.amount()).isEqualByComparingTo("12.00");
	}

	@Test
	void updateChangesCategory() throws Exception {
		Expense expense = sampleExpense(5L, groceries, LocalDate.of(2026, 7, 5));
		when(expenseRepository.findById(5L)).thenReturn(Optional.of(expense));
		when(categoryRepository.findById(2L)).thenReturn(Optional.of(utilities));
		when(expenseRepository.saveAndFlush(any(Expense.class))).thenAnswer(invocation -> invocation.getArgument(0));

		ExpenseResponse response = expenseService.update(5L, new ExpenseUpdateRequest(
			"Power bill",
			null,
			new BigDecimal("80.00"),
			LocalDate.of(2026, 7, 5),
			2L,
			null
		));

		assertThat(response.category().id()).isEqualTo(2L);
		assertThat(response.category().name()).isEqualTo("Utilities");
	}

	@Test
	void deleteExistingExpense() throws Exception {
		Expense expense = sampleExpense(5L, groceries, LocalDate.of(2026, 7, 5));
		when(expenseRepository.findById(5L)).thenReturn(Optional.of(expense));

		expenseService.delete(5L);

		verify(expenseRepository).delete(expense);
	}

	@Test
	void deleteMissingExpenseThrows() {
		when(expenseRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> expenseService.delete(99L))
			.isInstanceOf(ExpenseNotFoundException.class);
	}

	@Test
	void listAllUsesRepositoryOrder() throws Exception {
		Expense newer = sampleExpense(2L, groceries, LocalDate.of(2026, 7, 10));
		Expense older = sampleExpense(1L, utilities, LocalDate.of(2026, 6, 1));
		when(expenseRepository.findAllByOrderByExpenseDateDescIdDesc()).thenReturn(List.of(newer, older));

		List<ExpenseResponse> response = expenseService.findAll(null, null, null);

		assertThat(response).extracting(ExpenseResponse::id).containsExactly(2L, 1L);
		verify(expenseRepository).findAllByOrderByExpenseDateDescIdDesc();
	}

	@Test
	void filterByMonth() throws Exception {
		when(expenseRepository.findByExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
			LocalDate.of(2026, 7, 1),
			LocalDate.of(2026, 8, 1)
		)).thenReturn(List.of(sampleExpense(1L, groceries, LocalDate.of(2026, 7, 15))));

		List<ExpenseResponse> response = expenseService.findAll(2026, 7, null);

		assertThat(response).hasSize(1);
	}

	@Test
	void filterByCategory() throws Exception {
		when(expenseRepository.findByCategory_IdOrderByExpenseDateDescIdDesc(1L))
			.thenReturn(List.of(sampleExpense(1L, groceries, LocalDate.of(2026, 7, 15))));

		List<ExpenseResponse> response = expenseService.findAll(null, null, 1L);

		assertThat(response).hasSize(1);
		verify(expenseRepository).findByCategory_IdOrderByExpenseDateDescIdDesc(1L);
	}

	@Test
	void filterByMonthAndCategory() throws Exception {
		when(expenseRepository.findByCategory_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
			1L,
			LocalDate.of(2026, 7, 1),
			LocalDate.of(2026, 8, 1)
		)).thenReturn(List.of());

		List<ExpenseResponse> response = expenseService.findAll(2026, 7, 1L);

		assertThat(response).isEmpty();
	}

	@Test
	void rejectYearWithoutMonth() {
		assertThatThrownBy(() -> expenseService.findAll(2026, null, null))
			.isInstanceOf(InvalidExpenseFilterException.class);
	}

	@Test
	void rejectMonthWithoutYear() {
		assertThatThrownBy(() -> expenseService.findAll(null, 7, null))
			.isInstanceOf(InvalidExpenseFilterException.class);
	}

	@Test
	void rejectInvalidMonth() {
		assertThatThrownBy(() -> expenseService.findAll(2026, 13, null))
			.isInstanceOf(InvalidExpenseFilterException.class);
	}

	@Test
	void rejectNonPositiveCategoryFilter() {
		assertThatThrownBy(() -> expenseService.findAll(null, null, 0L))
			.isInstanceOf(InvalidExpenseFilterException.class);
	}

	private Expense sampleExpense(Long id, Category category, LocalDate date) throws Exception {
		Expense expense = new Expense(
			"Sample",
			"Store",
			new BigDecimal("10.00"),
			date,
			null,
			category
		);
		setId(expense, id);
		setTimestamps(expense, Instant.parse("2026-01-01T00:00:00Z"), Instant.parse("2026-01-01T00:00:00Z"));
		return expense;
	}

	private static void setId(Category category, Long id) throws Exception {
		Field field = Category.class.getDeclaredField("id");
		field.setAccessible(true);
		field.set(category, id);
	}

	private static void setId(Expense expense, Long id) throws Exception {
		Field field = Expense.class.getDeclaredField("id");
		field.setAccessible(true);
		field.set(expense, id);
	}

	private static void setTimestamps(Expense expense, Instant createdAt, Instant updatedAt) throws Exception {
		Field created = Expense.class.getDeclaredField("createdAt");
		created.setAccessible(true);
		created.set(expense, createdAt);
		Field updated = Expense.class.getDeclaredField("updatedAt");
		updated.setAccessible(true);
		updated.set(expense, updatedAt);
	}
}
