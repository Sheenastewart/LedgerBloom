package com.ledgerbloom.budget;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.category.Category;
import com.ledgerbloom.expense.Expense;
import com.ledgerbloom.expense.ExpenseRepository;
import com.ledgerbloom.recurring.RecurringExpenseRepository;
import com.ledgerbloom.user.User;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
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
class MonthlyBudgetServiceTest {

	private static final Long USER_ID = 1L;

	@Mock
	private MonthlyBudgetRepository monthlyBudgetRepository;

	@Mock
	private BudgetGroupLimitRepository budgetGroupLimitRepository;

	@Mock
	private ExpenseRepository expenseRepository;

	@Mock
	private RecurringExpenseRepository recurringExpenseRepository;

	@Mock
	private CurrentUser currentUser;

	@InjectMocks
	private MonthlyBudgetService monthlyBudgetService;

	private User user;
	private Category groceries;
	private MonthlyBudget julyBudget;
	private final List<BudgetGroupLimit> savedLimits = new ArrayList<>();

	@BeforeEach
	void setUp() throws Exception {
		user = new User("user@example.com", "hash", "Test User");
		setUserId(user, USER_ID);
		lenient().when(currentUser.requireUserId()).thenReturn(USER_ID);
		lenient().when(currentUser.requireUserReference()).thenReturn(user);

		groceries = new Category(user, "Groceries", null, BudgetGroup.GROCERIES);
		setId(groceries, 1L);
		julyBudget = new MonthlyBudget(user, 2026, 7, new BigDecimal("4300.00"), false);
		setId(julyBudget, 10L);
		setTimestamps(julyBudget, Instant.parse("2026-01-01T00:00:00Z"), Instant.parse("2026-01-01T00:00:00Z"));

		lenient().when(budgetGroupLimitRepository.saveAndFlush(any(BudgetGroupLimit.class))).thenAnswer(invocation -> {
			BudgetGroupLimit limit = invocation.getArgument(0);
			if (limit.getId() == null) {
				setId(limit, (long) (savedLimits.size() + 1));
			}
			savedLimits.removeIf(existing -> existing.getBudgetGroup() == limit.getBudgetGroup());
			savedLimits.add(limit);
			return limit;
		});
		lenient().when(budgetGroupLimitRepository.findByMonthlyBudget_IdOrderByIdAsc(any())).thenAnswer(invocation ->
			List.copyOf(savedLimits)
		);
		lenient().doAnswer(invocation -> {
			BudgetGroupLimit limit = invocation.getArgument(0);
			savedLimits.removeIf(existing -> existing.getId() != null && existing.getId().equals(limit.getId()));
			return null;
		}).when(budgetGroupLimitRepository).delete(any(BudgetGroupLimit.class));
		lenient().doNothing().when(budgetGroupLimitRepository).flush();
		lenient().when(recurringExpenseRepository.findActiveDueOnOrBefore(eq(USER_ID), any())).thenReturn(List.of());
		stubEmptyExpenses(2026, 7);
	}

	@Test
	void createBudgetSeedsPresetGroupsAndLocks() throws Exception {
		when(monthlyBudgetRepository.existsByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 7)).thenReturn(false);
		when(monthlyBudgetRepository.saveAndFlush(any(MonthlyBudget.class))).thenAnswer(invocation -> {
			MonthlyBudget budget = invocation.getArgument(0);
			setId(budget, 10L);
			onCreate(budget);
			return budget;
		});

		MonthlyBudgetResponse response = monthlyBudgetService.create(
			new MonthlyBudgetCreateRequest(2026, 7, new BigDecimal("1000.00"))
		);

		assertThat(response.userModified()).isTrue();
		assertThat(response.groupLimits()).hasSize(BudgetGroup.values().length);
		assertThat(savedLimits).hasSize(BudgetGroup.values().length);
		assertThat(savedLimits.stream().map(BudgetGroupLimit::getBudgetGroup))
			.contains(BudgetGroup.BILLS, BudgetGroup.GROCERIES, BudgetGroup.CHILD_CARE);
	}

	@Test
	void ensureAutoBudgetCreatesFromPresetsWhenMissing() throws Exception {
		when(monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 7))
			.thenReturn(Optional.empty())
			.thenReturn(Optional.of(julyBudget));
		when(monthlyBudgetRepository.saveAndFlush(any(MonthlyBudget.class))).thenAnswer(invocation -> {
			MonthlyBudget budget = invocation.getArgument(0);
			setId(budget, 10L);
			onCreate(budget);
			julyBudget = budget;
			return budget;
		});

		MonthlyBudgetResponse response = monthlyBudgetService.ensureAutoBudget(2026, 7);

		assertThat(response.userModified()).isFalse();
		assertThat(response.groupLimits()).hasSize(BudgetGroup.values().length);
		BudgetGroupLimitResponse groceriesRow = response.groupLimits().stream()
			.filter(row -> row.group().key().equals("GROCERIES"))
			.findFirst()
			.orElseThrow();
		assertThat(groceriesRow.limitAmount()).isEqualByComparingTo("250.00");
	}

	@Test
	void ensureAutoBudgetSkipsRefreshWhenUserModified() {
		julyBudget.setUserModified(true);
		when(monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 7))
			.thenReturn(Optional.of(julyBudget));
		savedLimits.add(new BudgetGroupLimit(
			user, julyBudget, BudgetGroup.GROCERIES, new BigDecimal("999.00"), BigDecimal.ZERO
		));

		MonthlyBudgetResponse response = monthlyBudgetService.ensureAutoBudget(2026, 7);

		assertThat(response.userModified()).isTrue();
		assertThat(response.groupLimits()).hasSize(1);
		assertThat(response.groupLimits().getFirst().limitAmount()).isEqualByComparingTo("999.00");
		verify(budgetGroupLimitRepository, never()).saveAndFlush(any());
	}

	@Test
	void ensureAutoBudgetRaisesExistingGroupToCoverActualSpendWithoutRecreatingDeleted() throws Exception {
		julyBudget.setUserModified(false);
		when(monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 7))
			.thenReturn(Optional.of(julyBudget));
		when(monthlyBudgetRepository.saveAndFlush(any(MonthlyBudget.class))).thenAnswer(invocation -> invocation.getArgument(0));

		Expense bigGrocery = new Expense(
			user, null, "Store", new BigDecimal("400.00"), LocalDate.of(2026, 7, 10), null, groceries
		);
		when(expenseRepository
			.findByUser_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
				eq(USER_ID), any(), any()
			)).thenReturn(List.of(bigGrocery));

		savedLimits.add(new BudgetGroupLimit(
			user, julyBudget, BudgetGroup.GROCERIES, BudgetGroup.GROCERIES.getPresetAmount(), BigDecimal.ZERO
		));

		MonthlyBudgetResponse response = monthlyBudgetService.ensureAutoBudget(2026, 7);

		assertThat(response.groupLimits()).hasSize(1);
		BudgetGroupLimitResponse groceriesRow = response.groupLimits().getFirst();
		assertThat(groceriesRow.limitAmount()).isEqualByComparingTo("400.00");
		assertThat(groceriesRow.actualSpent()).isEqualByComparingTo("400.00");
	}

	@Test
	void updateGroupLimitLocksBudget() throws Exception {
		julyBudget.setUserModified(false);
		when(monthlyBudgetRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(julyBudget));
		when(monthlyBudgetRepository.saveAndFlush(any(MonthlyBudget.class))).thenAnswer(invocation -> invocation.getArgument(0));
		BudgetGroupLimit limit = new BudgetGroupLimit(
			user, julyBudget, BudgetGroup.GROCERIES, new BigDecimal("250.00"), BigDecimal.ZERO
		);
		setId(limit, 50L);
		when(budgetGroupLimitRepository.findByIdAndMonthlyBudget_IdAndUser_Id(50L, 10L, USER_ID))
			.thenReturn(Optional.of(limit));
		savedLimits.add(limit);

		MonthlyBudgetResponse response = monthlyBudgetService.updateGroupLimit(
			10L,
			50L,
			new BudgetGroupLimitUpdateRequest(new BigDecimal("300.00"), BigDecimal.ZERO)
		);

		assertThat(response.userModified()).isTrue();
		assertThat(limit.getLimitAmount()).isEqualByComparingTo("300.00");
		ArgumentCaptor<MonthlyBudget> budgetCaptor = ArgumentCaptor.forClass(MonthlyBudget.class);
		verify(monthlyBudgetRepository).saveAndFlush(budgetCaptor.capture());
		assertThat(budgetCaptor.getValue().isUserModified()).isTrue();
	}

	@Test
	void updateGroupLimitMissingThrows() {
		when(monthlyBudgetRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(julyBudget));
		when(budgetGroupLimitRepository.findByIdAndMonthlyBudget_IdAndUser_Id(99L, 10L, USER_ID))
			.thenReturn(Optional.empty());

		assertThatThrownBy(() -> monthlyBudgetService.updateGroupLimit(
			10L,
			99L,
			new BudgetGroupLimitUpdateRequest(new BigDecimal("100.00"), null)
		)).isInstanceOf(BudgetGroupLimitNotFoundException.class);
	}

	@Test
	void createGroupLimitRejectsInvalidAmount() {
		when(monthlyBudgetRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(julyBudget));

		assertThatThrownBy(() -> monthlyBudgetService.createGroupLimit(
			10L,
			new BudgetGroupLimitCreateRequest("GROCERIES", new BigDecimal("0.00"), null)
		)).isInstanceOf(InvalidBudgetDataException.class)
			.hasMessageContaining("greater than zero");
	}

	@Test
	void getByYearAndMonthDoesNotReseedDeletedGroups() throws Exception {
		julyBudget.setUserModified(true);
		when(monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 7))
			.thenReturn(Optional.of(julyBudget));
		BudgetGroupLimit subscriptions = new BudgetGroupLimit(
			user, julyBudget, BudgetGroup.SUBSCRIPTIONS, new BigDecimal("30.89"), BigDecimal.ZERO
		);
		setId(subscriptions, 1L);
		savedLimits.add(subscriptions);

		MonthlyBudgetResponse response = monthlyBudgetService.getByYearAndMonth(2026, 7);

		assertThat(response.groupLimits()).hasSize(1);
		assertThat(response.groupLimits().getFirst().group().key()).isEqualTo("SUBSCRIPTIONS");
		assertThat(response.groupLimits().getFirst().limitAmount()).isEqualByComparingTo("30.89");
		verify(budgetGroupLimitRepository, never()).saveAndFlush(any());
		verify(monthlyBudgetRepository, never()).saveAndFlush(any());
	}

	@Test
	void getByYearAndMonthReturnsEmptyGroupsWithoutSeeding() {
		when(monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 7))
			.thenReturn(Optional.of(julyBudget));
		savedLimits.clear();

		MonthlyBudgetResponse response = monthlyBudgetService.getByYearAndMonth(2026, 7);

		assertThat(response.groupLimits()).isEmpty();
		verify(budgetGroupLimitRepository, never()).saveAndFlush(any());
	}

	@Test
	void getMissingBudgetThrows() {
		when(monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 8))
			.thenReturn(Optional.empty());

		assertThatThrownBy(() -> monthlyBudgetService.getByYearAndMonth(2026, 8))
			.isInstanceOf(MonthlyBudgetNotFoundException.class);
	}

	@Test
	void deleteGroupLimitKeepsGroupDeletedAfterReload() throws Exception {
		julyBudget.setUserModified(false);
		when(monthlyBudgetRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(julyBudget));
		when(monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 7))
			.thenReturn(Optional.of(julyBudget));
		when(monthlyBudgetRepository.saveAndFlush(any(MonthlyBudget.class))).thenAnswer(invocation -> invocation.getArgument(0));

		BudgetGroupLimit groceriesLimit = new BudgetGroupLimit(
			user, julyBudget, BudgetGroup.GROCERIES, new BigDecimal("250.00"), BigDecimal.ZERO
		);
		setId(groceriesLimit, 50L);
		BudgetGroupLimit billsLimit = new BudgetGroupLimit(
			user, julyBudget, BudgetGroup.BILLS, new BigDecimal("2000.00"), BigDecimal.ZERO
		);
		setId(billsLimit, 51L);
		savedLimits.add(groceriesLimit);
		savedLimits.add(billsLimit);
		when(budgetGroupLimitRepository.findByIdAndMonthlyBudget_IdAndUser_Id(50L, 10L, USER_ID))
			.thenReturn(Optional.of(groceriesLimit));

		MonthlyBudgetResponse afterDelete = monthlyBudgetService.deleteGroupLimit(10L, 50L);
		assertThat(afterDelete.groupLimits()).hasSize(1);
		assertThat(afterDelete.groupLimits().getFirst().group().key()).isEqualTo("BILLS");
		assertThat(afterDelete.userModified()).isTrue();

		MonthlyBudgetResponse afterReload = monthlyBudgetService.getByYearAndMonth(2026, 7);
		assertThat(afterReload.groupLimits()).hasSize(1);
		assertThat(afterReload.groupLimits().getFirst().group().key()).isEqualTo("BILLS");
	}

	@Test
	void deleteMissingGroupLimitThrows() {
		when(monthlyBudgetRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(julyBudget));
		when(budgetGroupLimitRepository.findByIdAndMonthlyBudget_IdAndUser_Id(99L, 10L, USER_ID))
			.thenReturn(Optional.empty());

		assertThatThrownBy(() -> monthlyBudgetService.deleteGroupLimit(10L, 99L))
			.isInstanceOf(BudgetGroupLimitNotFoundException.class);
	}

	@Test
	void restoreDefaultsAddsOnlyMissingPresetsAndPreservesEditedLimits() throws Exception {
		julyBudget.setUserModified(true);
		julyBudget.setTotalLimit(new BigDecimal("999.00"));
		when(monthlyBudgetRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(julyBudget));
		when(monthlyBudgetRepository.saveAndFlush(any(MonthlyBudget.class))).thenAnswer(invocation -> invocation.getArgument(0));
		BudgetGroupLimit groceriesLimit = new BudgetGroupLimit(
			user, julyBudget, BudgetGroup.GROCERIES, new BigDecimal("333.00"), BigDecimal.ZERO
		);
		setId(groceriesLimit, 50L);
		savedLimits.add(groceriesLimit);

		BudgetGroupRestoreDefaultsResponse result = monthlyBudgetService.restoreDefaultGroupLimits(10L);

		assertThat(result.restored()).hasSize(BudgetGroup.values().length - 1);
		assertThat(result.skipped()).extracting(BudgetGroupSummary::key).containsExactly("GROCERIES");
		assertThat(result.budget().groupLimits()).hasSize(BudgetGroup.values().length);
		BudgetGroupLimitResponse groceriesRow = result.budget().groupLimits().stream()
			.filter(row -> row.group().key().equals("GROCERIES"))
			.findFirst()
			.orElseThrow();
		assertThat(groceriesRow.limitAmount()).isEqualByComparingTo("333.00");
		assertThat(result.budget().userModified()).isTrue();
	}

	@Test
	void restoreDefaultsIsIdempotentWhenAllPresetsExist() {
		julyBudget.setUserModified(true);
		when(monthlyBudgetRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.of(julyBudget));
		for (BudgetGroup group : BudgetGroup.values()) {
			savedLimits.add(new BudgetGroupLimit(user, julyBudget, group, group.getPresetAmount(), BigDecimal.ZERO));
		}

		BudgetGroupRestoreDefaultsResponse result = monthlyBudgetService.restoreDefaultGroupLimits(10L);

		assertThat(result.restored()).isEmpty();
		assertThat(result.skipped()).hasSize(BudgetGroup.values().length);
		verify(budgetGroupLimitRepository, never()).saveAndFlush(any());
		verify(monthlyBudgetRepository, never()).saveAndFlush(any());
	}

	@Test
	void restoreDefaultsMissingBudgetThrows() {
		when(monthlyBudgetRepository.findByIdAndUser_Id(99L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> monthlyBudgetService.restoreDefaultGroupLimits(99L))
			.isInstanceOf(MonthlyBudgetNotFoundException.class);
	}

	@Test
	void crossUserBudgetAccessThrowsNotFound() {
		when(monthlyBudgetRepository.findByIdAndUser_Id(10L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> monthlyBudgetService.deleteGroupLimit(10L, 50L))
			.isInstanceOf(MonthlyBudgetNotFoundException.class);
	}

	@Test
	void getByYearAndMonthAggregatesSpendByGroup() throws Exception {
		when(monthlyBudgetRepository.findByUser_IdAndBudgetYearAndBudgetMonth(USER_ID, 2026, 7))
			.thenReturn(Optional.of(julyBudget));
		for (BudgetGroup group : BudgetGroup.values()) {
			savedLimits.add(new BudgetGroupLimit(
				user, julyBudget, group, group.getPresetAmount(), BigDecimal.ZERO
			));
		}

		Expense expense = new Expense(
			user, null, "Store", new BigDecimal("80.00"), LocalDate.of(2026, 7, 5), null, groceries
		);
		when(expenseRepository
			.findByUser_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
				eq(USER_ID), any(), any()
			)).thenReturn(List.of(expense));

		MonthlyBudgetResponse response = monthlyBudgetService.getByYearAndMonth(2026, 7);

		BudgetGroupLimitResponse groceriesRow = response.groupLimits().stream()
			.filter(row -> row.group().key().equals("GROCERIES"))
			.findFirst()
			.orElseThrow();
		assertThat(groceriesRow.actualSpent()).isEqualByComparingTo("80.00");
		assertThat(groceriesRow.group().label()).isEqualTo("Groceries");
	}

	private void stubEmptyExpenses(int year, int month) {
		lenient().when(expenseRepository
			.findByUser_IdAndExpenseDateGreaterThanEqualAndExpenseDateLessThanOrderByExpenseDateDescIdDesc(
				eq(USER_ID), any(), any()
			)).thenReturn(List.of());
	}

	private static void setUserId(User user, Long id) throws Exception {
		Field field = User.class.getDeclaredField("id");
		field.setAccessible(true);
		field.set(user, id);
	}

	private static void setId(Object entity, Long id) throws Exception {
		Field field = entity.getClass().getDeclaredField("id");
		field.setAccessible(true);
		field.set(entity, id);
	}

	private static void setTimestamps(MonthlyBudget budget, Instant created, Instant updated) throws Exception {
		Field createdField = MonthlyBudget.class.getDeclaredField("createdAt");
		createdField.setAccessible(true);
		createdField.set(budget, created);
		Field updatedField = MonthlyBudget.class.getDeclaredField("updatedAt");
		updatedField.setAccessible(true);
		updatedField.set(budget, updated);
	}

	private static void onCreate(MonthlyBudget budget) throws Exception {
		budget.getClass().getDeclaredMethod("onCreate").setAccessible(true);
		budget.getClass().getDeclaredMethod("onCreate").invoke(budget);
	}
}
