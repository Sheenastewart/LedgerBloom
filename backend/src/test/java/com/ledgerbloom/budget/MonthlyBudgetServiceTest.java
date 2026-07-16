package com.ledgerbloom.budget;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.category.Category;
import com.ledgerbloom.category.CategoryNotFoundException;
import com.ledgerbloom.category.CategoryRepository;
import com.ledgerbloom.expense.Expense;
import com.ledgerbloom.expense.ExpenseRepository;
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
import org.springframework.dao.DataIntegrityViolationException;

@ExtendWith(MockitoExtension.class)
class MonthlyBudgetServiceTest {

	private static final Long USER_ID = 1L;

	@Mock
	private MonthlyBudgetRepository monthlyBudgetRepository;

	@Mock
	private CategoryBudgetLimitRepository categoryBudgetLimitRepository;

	@Mock
	private CategoryRepository categoryRepository;

	@Mock
	private ExpenseRepository expenseRepository;

	@Mock
	private CurrentUser currentUser;

	@InjectMocks
	private MonthlyBudgetService monthlyBudgetService;

	private User user;
	private Category groceries;
	private Category utilities;
	private MonthlyBudget julyBudget;

	@BeforeEach
	void setUp() throws Exception {
		user = new User("user@example.com", "hash", "Test User");
		setUserId(user, USER_ID);
		lenient().when(currentUser.requireUserId()).thenReturn(USER_ID);
		lenient().when(currentUser.requireUserReference()).thenReturn(user);

		groceries = new Category(user, "Groceries", null);
		setId(groceries, 1L);
		utilities = new Category(user, "Utilities", null);
		setId(utilities, 2L);
		julyBudget = new MonthlyBudget(user, 2026, 7, new BigDecimal("1000.00"));
		setId(julyBudget, 10L);
		setTimestamps(julyBudget, Instant.parse("2026-01-01T00:00:00Z"), Instant.parse("2026-01-01T00:00:00Z"));
	}

	@Test
	void createBudget() throws Exception {
		when(monthlyBudgetRepository.existsByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 7)).thenReturn(false);
		when(monthlyBudgetRepository.saveAndFlush(any(MonthlyBudget.class))).thenAnswer(invocation -> {
			MonthlyBudget budget = invocation.getArgument(0);
			setId(budget, 10L);
			onCreate(budget);
			return budget;
		});
		stubEmptyExpenses(2026, 7);
		when(categoryBudgetLimitRepository.findByMonthlyBudget_IdOrderByIdAsc(10L)).thenReturn(List.of());

		MonthlyBudgetResponse response = monthlyBudgetService.create(
			new MonthlyBudgetCreateRequest(2026, 7, new BigDecimal("1000.00"))
		);

		assertThat(response.id()).isEqualTo(10L);
		assertThat(response.year()).isEqualTo(2026);
		assertThat(response.month()).isEqualTo(7);
		assertThat(response.totalLimit()).isEqualByComparingTo("1000.00");
		assertThat(response.actualExpenses()).isEqualByComparingTo("0.00");
		assertThat(response.remaining()).isEqualByComparingTo("1000.00");
		assertThat(response.percentUsed()).isEqualByComparingTo("0.00");
		assertThat(response.overBudget()).isFalse();
	}

	@Test
	void createRejectsDuplicateMonth() {
		when(monthlyBudgetRepository.existsByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 7)).thenReturn(true);

		assertThatThrownBy(() -> monthlyBudgetService.create(
			new MonthlyBudgetCreateRequest(2026, 7, new BigDecimal("1000.00"))
		)).isInstanceOf(MonthlyBudgetAlreadyExistsException.class);

		verify(monthlyBudgetRepository, never()).saveAndFlush(any());
	}

	@Test
	void createRejectsInvalidYear() {
		assertThatThrownBy(() -> monthlyBudgetService.create(
			new MonthlyBudgetCreateRequest(0, 7, new BigDecimal("1000.00"))
		)).isInstanceOf(InvalidBudgetFilterException.class);
	}

	@Test
	void createRejectsInvalidMonth() {
		assertThatThrownBy(() -> monthlyBudgetService.create(
			new MonthlyBudgetCreateRequest(2026, 13, new BigDecimal("1000.00"))
		)).isInstanceOf(InvalidBudgetFilterException.class);
	}

	@Test
	void createRejectsZeroAmount() {
		assertThatThrownBy(() -> monthlyBudgetService.create(
			new MonthlyBudgetCreateRequest(2026, 7, new BigDecimal("0.00"))
		)).isInstanceOf(InvalidBudgetDataException.class);
	}

	@Test
	void createRejectsNegativeAmount() {
		assertThatThrownBy(() -> monthlyBudgetService.create(
			new MonthlyBudgetCreateRequest(2026, 7, new BigDecimal("-10.00"))
		)).isInstanceOf(InvalidBudgetDataException.class);
	}

	@Test
	void createRejectsOversizedAmount() {
		assertThatThrownBy(() -> monthlyBudgetService.create(
			new MonthlyBudgetCreateRequest(2026, 7, new BigDecimal("10000000000.00"))
		)).isInstanceOf(InvalidBudgetDataException.class);
	}

	@Test
	void createRejectsTooManyDecimalPlaces() {
		assertThatThrownBy(() -> monthlyBudgetService.create(
			new MonthlyBudgetCreateRequest(2026, 7, new BigDecimal("10.001"))
		)).isInstanceOf(InvalidBudgetDataException.class);
	}

	@Test
	void getExistingBudget() {
		when(monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 7))
			.thenReturn(Optional.of(julyBudget));
		stubEmptyExpenses(2026, 7);
		when(categoryBudgetLimitRepository.findByMonthlyBudget_IdOrderByIdAsc(10L)).thenReturn(List.of());

		MonthlyBudgetResponse response = monthlyBudgetService.getByYearAndMonth(2026, 7);

		assertThat(response.id()).isEqualTo(10L);
		assertThat(response.totalLimit()).isEqualByComparingTo("1000.00");
	}

	@Test
	void getMissingBudgetThrows() {
		when(monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 8))
			.thenReturn(Optional.empty());

		assertThatThrownBy(() -> monthlyBudgetService.getByYearAndMonth(2026, 8))
			.isInstanceOf(MonthlyBudgetNotFoundException.class);
	}

	@Test
	void updateBudget() {
		when(monthlyBudgetRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(julyBudget));
		when(monthlyBudgetRepository.saveAndFlush(any(MonthlyBudget.class))).thenAnswer(invocation -> invocation.getArgument(0));
		stubEmptyExpenses(2026, 7);
		when(categoryBudgetLimitRepository.findByMonthlyBudget_IdOrderByIdAsc(10L)).thenReturn(List.of());

		MonthlyBudgetResponse response = monthlyBudgetService.update(
			10L,
			new MonthlyBudgetUpdateRequest(new BigDecimal("1500.00"))
		);

		assertThat(response.totalLimit()).isEqualByComparingTo("1500.00");
		ArgumentCaptor<MonthlyBudget> captor = ArgumentCaptor.forClass(MonthlyBudget.class);
		verify(monthlyBudgetRepository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getTotalLimit()).isEqualByComparingTo("1500.00");
	}

	@Test
	void deleteBudget() {
		when(monthlyBudgetRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(julyBudget));

		monthlyBudgetService.delete(10L);

		verify(monthlyBudgetRepository).delete(julyBudget);
	}

	@Test
	void createCategoryLimit() throws Exception {
		when(monthlyBudgetRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(julyBudget));
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(groceries));
		when(categoryBudgetLimitRepository.existsByMonthlyBudget_IdAndCategory_IdAndUser_Id(10L, 1L, USER_ID))
			.thenReturn(false);
		when(categoryBudgetLimitRepository.saveAndFlush(any(CategoryBudgetLimit.class))).thenAnswer(invocation -> {
			CategoryBudgetLimit limit = invocation.getArgument(0);
			setId(limit, 50L);
			onCreate(limit);
			return limit;
		});
		stubEmptyExpenses(2026, 7);
		when(categoryBudgetLimitRepository.findByMonthlyBudget_IdOrderByIdAsc(10L)).thenAnswer(invocation -> {
			CategoryBudgetLimit limit = new CategoryBudgetLimit(user, julyBudget, groceries, new BigDecimal("200.00"));
			setId(limit, 50L);
			return List.of(limit);
		});

		MonthlyBudgetResponse response = monthlyBudgetService.createCategoryLimit(
			10L,
			new CategoryBudgetLimitCreateRequest(1L, new BigDecimal("200.00"))
		);

		assertThat(response.categoryLimits()).hasSize(1);
		assertThat(response.categoryLimits().get(0).limitAmount()).isEqualByComparingTo("200.00");
		assertThat(response.categoryLimits().get(0).category().name()).isEqualTo("Groceries");
	}

	@Test
	void createCategoryLimitRejectsDuplicate() {
		when(monthlyBudgetRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(julyBudget));
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(groceries));
		when(categoryBudgetLimitRepository.existsByMonthlyBudget_IdAndCategory_IdAndUser_Id(10L, 1L, USER_ID))
			.thenReturn(true);

		assertThatThrownBy(() -> monthlyBudgetService.createCategoryLimit(
			10L,
			new CategoryBudgetLimitCreateRequest(1L, new BigDecimal("200.00"))
		)).isInstanceOf(CategoryBudgetAlreadyExistsException.class);

		verify(categoryBudgetLimitRepository, never()).saveAndFlush(any());
	}

	@Test
	void createCategoryLimitRejectsMissingCategory() {
		when(monthlyBudgetRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(julyBudget));
		when(categoryRepository.findByIdAndUser_Id(99L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> monthlyBudgetService.createCategoryLimit(
			10L,
			new CategoryBudgetLimitCreateRequest(99L, new BigDecimal("200.00"))
		)).isInstanceOf(CategoryNotFoundException.class);
	}

	@Test
	void updateCategoryLimit() throws Exception {
		CategoryBudgetLimit limit = new CategoryBudgetLimit(user, julyBudget, groceries, new BigDecimal("200.00"));
		setId(limit, 50L);
		when(monthlyBudgetRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(julyBudget));
		when(categoryBudgetLimitRepository.findByIdAndMonthlyBudget_IdAndUser_Id(50L, 10L, USER_ID))
			.thenReturn(Optional.of(limit));
		when(categoryBudgetLimitRepository.saveAndFlush(any(CategoryBudgetLimit.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));
		stubEmptyExpenses(2026, 7);
		when(categoryBudgetLimitRepository.findByMonthlyBudget_IdOrderByIdAsc(10L)).thenReturn(List.of(limit));

		MonthlyBudgetResponse response = monthlyBudgetService.updateCategoryLimit(
			10L,
			50L,
			new CategoryBudgetLimitUpdateRequest(new BigDecimal("250.00"))
		);

		assertThat(response.categoryLimits().get(0).limitAmount()).isEqualByComparingTo("250.00");
	}

	@Test
	void deleteCategoryLimit() throws Exception {
		CategoryBudgetLimit limit = new CategoryBudgetLimit(user, julyBudget, groceries, new BigDecimal("200.00"));
		setId(limit, 50L);
		when(monthlyBudgetRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(julyBudget));
		when(categoryBudgetLimitRepository.findByIdAndMonthlyBudget_IdAndUser_Id(50L, 10L, USER_ID))
			.thenReturn(Optional.of(limit));
		stubEmptyExpenses(2026, 7);
		when(categoryBudgetLimitRepository.findByMonthlyBudget_IdOrderByIdAsc(10L)).thenReturn(List.of());

		MonthlyBudgetResponse response = monthlyBudgetService.deleteCategoryLimit(10L, 50L);

		verify(categoryBudgetLimitRepository).delete(limit);
		assertThat(response.categoryLimits()).isEmpty();
	}

	@Test
	void missingCategoryLimitThrows() {
		when(monthlyBudgetRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(julyBudget));
		when(categoryBudgetLimitRepository.findByIdAndMonthlyBudget_IdAndUser_Id(99L, 10L, USER_ID))
			.thenReturn(Optional.empty());

		assertThatThrownBy(() -> monthlyBudgetService.updateCategoryLimit(
			10L,
			99L,
			new CategoryBudgetLimitUpdateRequest(new BigDecimal("100.00"))
		)).isInstanceOf(CategoryBudgetLimitNotFoundException.class);
	}

	@Test
	void calculatesOverallActualRemainingOverBudgetAndPercent() throws Exception {
		when(monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 7))
			.thenReturn(Optional.of(julyBudget));
		stubExpenses(2026, 7, List.of(
			expense(1L, "Food", "400.00", LocalDate.of(2026, 7, 2), groceries),
			expense(2L, "Power", "200.00", LocalDate.of(2026, 7, 5), utilities)
		));
		when(categoryBudgetLimitRepository.findByMonthlyBudget_IdOrderByIdAsc(10L)).thenReturn(List.of());

		MonthlyBudgetResponse response = monthlyBudgetService.getByYearAndMonth(2026, 7);

		assertThat(response.actualExpenses()).isEqualByComparingTo("600.00");
		assertThat(response.remaining()).isEqualByComparingTo("400.00");
		assertThat(response.overBudget()).isFalse();
		assertThat(response.percentUsed()).isEqualByComparingTo("60.00");
		assertThat(response.expenseCount()).isEqualTo(2);
	}

	@Test
	void calculatesOverallOverBudget() throws Exception {
		when(monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 7))
			.thenReturn(Optional.of(julyBudget));
		stubExpenses(2026, 7, List.of(
			expense(1L, "Big", "1200.00", LocalDate.of(2026, 7, 2), groceries)
		));
		when(categoryBudgetLimitRepository.findByMonthlyBudget_IdOrderByIdAsc(10L)).thenReturn(List.of());

		MonthlyBudgetResponse response = monthlyBudgetService.getByYearAndMonth(2026, 7);

		assertThat(response.actualExpenses()).isEqualByComparingTo("1200.00");
		assertThat(response.remaining()).isEqualByComparingTo("-200.00");
		assertThat(response.overBudget()).isTrue();
		assertThat(response.percentUsed()).isEqualByComparingTo("120.00");
	}

	@Test
	void calculatesCategoryActualRemainingOverBudgetAndPercent() throws Exception {
		CategoryBudgetLimit groceriesLimit = new CategoryBudgetLimit(user, julyBudget, groceries, new BigDecimal("300.00"));
		setId(groceriesLimit, 50L);
		when(monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 7))
			.thenReturn(Optional.of(julyBudget));
		stubExpenses(2026, 7, List.of(
			expense(1L, "Milk", "100.00", LocalDate.of(2026, 7, 1), groceries),
			expense(2L, "Eggs", "50.00", LocalDate.of(2026, 7, 2), groceries),
			expense(3L, "Power", "80.00", LocalDate.of(2026, 7, 3), utilities)
		));
		when(categoryBudgetLimitRepository.findByMonthlyBudget_IdOrderByIdAsc(10L))
			.thenReturn(List.of(groceriesLimit));

		MonthlyBudgetResponse response = monthlyBudgetService.getByYearAndMonth(2026, 7);
		CategoryBudgetLimitResponse category = response.categoryLimits().get(0);

		assertThat(category.actualSpent()).isEqualByComparingTo("150.00");
		assertThat(category.remaining()).isEqualByComparingTo("150.00");
		assertThat(category.overBudget()).isFalse();
		assertThat(category.percentUsed()).isEqualByComparingTo("50.00");
	}

	@Test
	void calculatesCategoryOverBudget() throws Exception {
		CategoryBudgetLimit groceriesLimit = new CategoryBudgetLimit(user, julyBudget, groceries, new BigDecimal("100.00"));
		setId(groceriesLimit, 50L);
		when(monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 7))
			.thenReturn(Optional.of(julyBudget));
		stubExpenses(2026, 7, List.of(
			expense(1L, "Milk", "150.00", LocalDate.of(2026, 7, 1), groceries)
		));
		when(categoryBudgetLimitRepository.findByMonthlyBudget_IdOrderByIdAsc(10L))
			.thenReturn(List.of(groceriesLimit));

		CategoryBudgetLimitResponse category = monthlyBudgetService.getByYearAndMonth(2026, 7).categoryLimits().get(0);

		assertThat(category.actualSpent()).isEqualByComparingTo("150.00");
		assertThat(category.remaining()).isEqualByComparingTo("-50.00");
		assertThat(category.overBudget()).isTrue();
		assertThat(category.percentUsed()).isEqualByComparingTo("150.00");
	}

	@Test
	void createMapsIntegrityViolationToDuplicateBudget() {
		when(monthlyBudgetRepository.existsByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 7)).thenReturn(false);
		when(monthlyBudgetRepository.saveAndFlush(any(MonthlyBudget.class)))
			.thenThrow(new DataIntegrityViolationException("unique"));

		assertThatThrownBy(() -> monthlyBudgetService.create(
			new MonthlyBudgetCreateRequest(2026, 7, new BigDecimal("1000.00"))
		)).isInstanceOf(MonthlyBudgetAlreadyExistsException.class);
	}

	private void stubEmptyExpenses(int year, int month) {
		stubExpenses(year, month, List.of());
	}

	private void stubExpenses(int year, int month, List<Expense> expenses) {
		LocalDate start = LocalDate.of(year, month, 1);
		LocalDate endExclusive = start.plusMonths(1);
		when(expenseRepository.findByUser_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
			USER_ID,
			start,
			endExclusive
		)).thenReturn(expenses);
	}

	private Expense expense(Long id, String description, String amount, LocalDate date, Category category)
			throws Exception {
		Expense expenseEntity = new Expense(user, description, null, new BigDecimal(amount), date, null, category);
		setId(expenseEntity, id);
		return expenseEntity;
	}

	private static void setId(Object entity, Long id) throws Exception {
		Field field = entity.getClass().getDeclaredField("id");
		field.setAccessible(true);
		field.set(entity, id);
	}

	private static void setUserId(User user, Long id) throws Exception {
		Field field = User.class.getDeclaredField("id");
		field.setAccessible(true);
		field.set(user, id);
	}

	private static void setTimestamps(MonthlyBudget budget, Instant createdAt, Instant updatedAt) throws Exception {
		Field created = MonthlyBudget.class.getDeclaredField("createdAt");
		created.setAccessible(true);
		created.set(budget, createdAt);
		Field updated = MonthlyBudget.class.getDeclaredField("updatedAt");
		updated.setAccessible(true);
		updated.set(budget, updatedAt);
	}

	private static void onCreate(Object entity) throws Exception {
		entity.getClass().getDeclaredMethod("onCreate").invoke(entity);
	}
}
