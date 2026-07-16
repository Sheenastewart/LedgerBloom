package com.ledgerbloom.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.budget.BudgetGroup;
import com.ledgerbloom.expense.ExpenseRepository;
import com.ledgerbloom.recurring.RecurringExpenseRepository;
import com.ledgerbloom.user.User;
import java.lang.reflect.Field;
import java.time.Instant;
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
class CategoryServiceTest {

	private static final Long USER_ID = 1L;

	@Mock
	private CategoryRepository categoryRepository;

	@Mock
	private ExpenseRepository expenseRepository;


	@Mock
	private RecurringExpenseRepository recurringExpenseRepository;

	@Mock
	private CurrentUser currentUser;

	@InjectMocks
	private CategoryService categoryService;

	private Category existing;
	private User user;

	@BeforeEach
	void setUp() throws Exception {
		user = new User("user@example.com", "hash", "Test User");
		setUserId(user, USER_ID);
		lenient().when(currentUser.requireUserId()).thenReturn(USER_ID);
		lenient().when(currentUser.requireUserReference()).thenReturn(user);

		existing = new Category(user, "Groceries", "Weekly shopping");
		setId(existing, 1L);
		setTimestamps(existing, Instant.parse("2026-01-01T00:00:00Z"), Instant.parse("2026-01-01T00:00:00Z"));
	}

	@Test
	void createValidCategory() {
		when(categoryRepository.existsByUser_IdAndNameIgnoreCase(USER_ID, "Groceries")).thenReturn(false);
		when(categoryRepository.saveAndFlush(any(Category.class))).thenAnswer(invocation -> {
			Category category = invocation.getArgument(0);
			setId(category, 10L);
			category.onCreate();
			return category;
		});

		CategoryResponse response = categoryService.create(new CategoryCreateRequest("Groceries", "Food", null, "GROCERIES"));

		assertThat(response.id()).isEqualTo(10L);
		assertThat(response.name()).isEqualTo("Groceries");
		assertThat(response.description()).isEqualTo("Food");
		assertThat(response.createdAt()).isNotNull();
		assertThat(response.updatedAt()).isNotNull();
	}

	@Test
	void createTrimsCategoryName() {
		when(categoryRepository.existsByUser_IdAndNameIgnoreCase(USER_ID, "Groceries")).thenReturn(false);
		when(categoryRepository.saveAndFlush(any(Category.class))).thenAnswer(invocation -> {
			Category category = invocation.getArgument(0);
			setId(category, 11L);
			category.onCreate();
			return category;
		});

		categoryService.create(new CategoryCreateRequest("  Groceries  ", "Food", null, "GROCERIES"));

		ArgumentCaptor<Category> captor = ArgumentCaptor.forClass(Category.class);
		verify(categoryRepository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getName()).isEqualTo("Groceries");
	}

	@Test
	void createConvertsBlankDescriptionToNull() {
		when(categoryRepository.existsByUser_IdAndNameIgnoreCase(USER_ID, "Groceries")).thenReturn(false);
		when(categoryRepository.saveAndFlush(any(Category.class))).thenAnswer(invocation -> {
			Category category = invocation.getArgument(0);
			setId(category, 12L);
			category.onCreate();
			return category;
		});

		CategoryResponse response = categoryService.create(new CategoryCreateRequest("Groceries", "   ", null, "GROCERIES"));

		assertThat(response.description()).isNull();
	}

	@Test
	void createRejectsDuplicateName() {
		when(categoryRepository.existsByUser_IdAndNameIgnoreCase(USER_ID, "groceries")).thenReturn(true);

		assertThatThrownBy(() -> categoryService.create(new CategoryCreateRequest("groceries", null, null, "GROCERIES")))
			.isInstanceOf(CategoryNameAlreadyExistsException.class);

		verify(categoryRepository, never()).saveAndFlush(any());
	}

	@Test
	void createMapsIntegrityViolationToDuplicate() {
		when(categoryRepository.existsByUser_IdAndNameIgnoreCase(USER_ID, "Groceries")).thenReturn(false);
		when(categoryRepository.saveAndFlush(any(Category.class)))
			.thenThrow(new DataIntegrityViolationException("unique"));

		assertThatThrownBy(() -> categoryService.create(new CategoryCreateRequest("Groceries", null, null, "GROCERIES")))
			.isInstanceOf(CategoryNameAlreadyExistsException.class);
	}

	@Test
	void findByIdReturnsCategory() {
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(existing));

		CategoryResponse response = categoryService.findById(1L);

		assertThat(response.id()).isEqualTo(1L);
		assertThat(response.name()).isEqualTo("Groceries");
	}

	@Test
	void findByIdThrowsWhenMissing() {
		when(categoryRepository.findByIdAndUser_Id(99L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> categoryService.findById(99L))
			.isInstanceOf(CategoryNotFoundException.class);
	}

	/**
	 * Ownership check: a category that exists but belongs to a different user must be
	 * indistinguishable from a missing category. The repository query is scoped by
	 * (id, userId) together, so another user's row simply never matches - this
	 * surfaces as CategoryNotFoundException (404), never a 403, so IDs of other users'
	 * resources are never confirmed to exist.
	 */
	@Test
	void findByIdOfAnotherUsersCategoryThrowsNotFoundNotForbidden() {
		when(categoryRepository.findByIdAndUser_Id(7L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> categoryService.findById(7L))
			.isInstanceOf(CategoryNotFoundException.class);

		verify(categoryRepository).findByIdAndUser_Id(7L, USER_ID);
	}

	@Test
	void updateCategory() {
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(existing));
		when(categoryRepository.existsByUser_IdAndNameIgnoreCaseAndIdNot(USER_ID, "Housing", 1L)).thenReturn(false);
		when(categoryRepository.saveAndFlush(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));

		CategoryResponse response = categoryService.update(1L, new CategoryUpdateRequest("Housing", "Rent", null, "BILLS"));

		assertThat(response.name()).isEqualTo("Housing");
		assertThat(response.description()).isEqualTo("Rent");
	}

	@Test
	void updateAllowsKeepingCurrentName() {
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(existing));
		when(categoryRepository.existsByUser_IdAndNameIgnoreCaseAndIdNot(USER_ID, "Groceries", 1L)).thenReturn(false);
		when(categoryRepository.saveAndFlush(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));

		CategoryResponse response = categoryService.update(1L, new CategoryUpdateRequest("Groceries", "Updated", null, "GROCERIES"));

		assertThat(response.name()).isEqualTo("Groceries");
		assertThat(response.description()).isEqualTo("Updated");
	}

	@Test
	void updateRejectsDuplicateOfAnotherCategory() {
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(existing));
		when(categoryRepository.existsByUser_IdAndNameIgnoreCaseAndIdNot(USER_ID, "Housing", 1L)).thenReturn(true);

		assertThatThrownBy(() -> categoryService.update(1L, new CategoryUpdateRequest("Housing", null, null, "BILLS")))
			.isInstanceOf(CategoryNameAlreadyExistsException.class);

		verify(categoryRepository, never()).saveAndFlush(any());
	}

	@Test
	void deleteExistingCategory() {
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(existing));
		when(expenseRepository.existsByCategory_Id(1L)).thenReturn(false);
		when(recurringExpenseRepository.existsByCategory_Id(1L)).thenReturn(false);

		categoryService.delete(1L);

		verify(categoryRepository).delete(existing);
		verify(categoryRepository).flush();
	}

	@Test
	void deleteRejectsCategoryInUse() {
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(existing));
		when(expenseRepository.existsByCategory_Id(1L)).thenReturn(true);

		assertThatThrownBy(() -> categoryService.delete(1L))
			.isInstanceOf(CategoryInUseException.class);

		verify(categoryRepository, never()).delete(any());
	}

	@Test
	void deleteRejectsCategoryWithRecurringExpense() {
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(existing));
		when(expenseRepository.existsByCategory_Id(1L)).thenReturn(false);
		when(recurringExpenseRepository.existsByCategory_Id(1L)).thenReturn(true);

		assertThatThrownBy(() -> categoryService.delete(1L))
			.isInstanceOf(CategoryInUseException.class);

		verify(categoryRepository, never()).delete(any());
	}

	@Test
	void deleteMapsIntegrityRaceToCategoryInUse() {
		when(categoryRepository.findByIdAndUser_Id(1L, USER_ID)).thenReturn(Optional.of(existing));
		when(expenseRepository.existsByCategory_Id(1L)).thenReturn(false);
		when(recurringExpenseRepository.existsByCategory_Id(1L)).thenReturn(false);
		org.mockito.Mockito.doThrow(new DataIntegrityViolationException("fk"))
			.when(categoryRepository).delete(existing);

		assertThatThrownBy(() -> categoryService.delete(1L))
			.isInstanceOf(CategoryInUseException.class);
	}

	@Test
	void deleteMissingCategoryThrows() {
		when(categoryRepository.findByIdAndUser_Id(99L, USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> categoryService.delete(99L))
			.isInstanceOf(CategoryNotFoundException.class);
	}

	@Test
	void findAllReturnsAlphabeticalIgnoreCase() throws Exception {
		Category bills = new Category(user, "bills", null);
		Category childcare = new Category(user, "Childcare", null);
		Category groceries = new Category(user, "groceries", null);
		Category housing = new Category(user, "Housing", null);
		setId(bills, 1L);
		setId(childcare, 2L);
		setId(groceries, 3L);
		setId(housing, 4L);
		setTimestamps(bills, Instant.now(), Instant.now());
		setTimestamps(childcare, Instant.now(), Instant.now());
		setTimestamps(groceries, Instant.now(), Instant.now());
		setTimestamps(housing, Instant.now(), Instant.now());

		when(categoryRepository.findByUser_IdOrderByNameIgnoreCase(USER_ID))
			.thenReturn(List.of(bills, childcare, groceries, housing));

		List<CategoryResponse> response = categoryService.findAll();

		assertThat(response).extracting(CategoryResponse::name)
			.containsExactly("bills", "Childcare", "groceries", "Housing");
	}

	@Test
	void createRejectsBlankNormalizedName() {
		assertThatThrownBy(() -> categoryService.create(new CategoryCreateRequest("   ", null, null, "GROCERIES")))
			.isInstanceOf(InvalidCategoryDataException.class);
	}

	@Test
	void createStarterSetForUserCreatesAllStarterCategoriesForNewAccount() {
		when(categoryRepository.existsByUser_IdAndNameIgnoreCase(eq(USER_ID), any())).thenReturn(false);
		when(categoryRepository.saveAndFlush(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));

		StarterCategoriesResponse response = categoryService.createStarterSetForUser(user);

		assertThat(response.createdCount()).isEqualTo(StarterCategoryNames.ALL.size());
		assertThat(response.createdNames()).containsExactlyElementsOf(StarterCategoryNames.ALL);
		assertThat(response.skippedCount()).isZero();
		assertThat(response.skippedNames()).isEmpty();
		verify(categoryRepository, org.mockito.Mockito.times(StarterCategoryNames.ALL.size())).saveAndFlush(any());
	}

	@Test
	void createStarterSetForUserSkipsExistingNamesCaseInsensitively() {
		when(categoryRepository.existsByUser_IdAndNameIgnoreCase(USER_ID, "Groceries")).thenReturn(true);
		when(categoryRepository.existsByUser_IdAndNameIgnoreCase(USER_ID, "Housing")).thenReturn(true);
		when(categoryRepository.existsByUser_IdAndNameIgnoreCase(USER_ID, "Other")).thenReturn(false);
		when(categoryRepository.existsByUser_IdAndNameIgnoreCase(eq(USER_ID), org.mockito.ArgumentMatchers.argThat(
			name -> !"Groceries".equals(name) && !"Housing".equals(name) && !"Other".equals(name)
		))).thenReturn(false);
		when(categoryRepository.saveAndFlush(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));

		StarterCategoriesResponse response = categoryService.createStarterSetForUser(user);

		assertThat(response.skippedNames()).contains("Groceries", "Housing");
		assertThat(response.skippedCount()).isEqualTo(2);
		assertThat(response.createdNames()).doesNotContain("Groceries", "Housing");
		assertThat(response.createdCount()).isEqualTo(StarterCategoryNames.ALL.size() - 2);
	}

	@Test
	void addStarterSetUsesAuthenticatedUser() {
		when(categoryRepository.existsByUser_IdAndNameIgnoreCase(eq(USER_ID), any())).thenReturn(true);

		StarterCategoriesResponse response = categoryService.addStarterSet();

		assertThat(response.createdCount()).isZero();
		assertThat(response.skippedCount()).isEqualTo(StarterCategoryNames.ALL.size());
		verify(currentUser).requireUserReference();
	}

	@Test
	void createStarterSetForUserDoesNotDuplicateOnSecondRequest() {
		when(categoryRepository.existsByUser_IdAndNameIgnoreCase(eq(USER_ID), any())).thenReturn(true);

		StarterCategoriesResponse response = categoryService.createStarterSetForUser(user);

		assertThat(response.createdCount()).isZero();
		assertThat(response.skippedCount()).isEqualTo(StarterCategoryNames.ALL.size());
		verify(categoryRepository, never()).saveAndFlush(any());
	}

	private static void setId(Category category, Long id) throws Exception {
		Field field = Category.class.getDeclaredField("id");
		field.setAccessible(true);
		field.set(category, id);
	}

	private static void setUserId(User user, Long id) throws Exception {
		Field field = User.class.getDeclaredField("id");
		field.setAccessible(true);
		field.set(user, id);
	}

	private static void setTimestamps(Category category, Instant createdAt, Instant updatedAt) throws Exception {
		Field created = Category.class.getDeclaredField("createdAt");
		created.setAccessible(true);
		created.set(category, createdAt);
		Field updated = Category.class.getDeclaredField("updatedAt");
		updated.setAccessible(true);
		updated.set(category, updatedAt);
	}
}
