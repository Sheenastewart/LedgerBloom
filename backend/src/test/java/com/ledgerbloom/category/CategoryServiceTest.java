package com.ledgerbloom.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import com.ledgerbloom.budget.CategoryBudgetLimitRepository;
import com.ledgerbloom.expense.ExpenseRepository;
import com.ledgerbloom.recurring.RecurringExpenseRepository;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

	@Mock
	private CategoryRepository categoryRepository;

	@Mock
	private ExpenseRepository expenseRepository;

	@Mock
	private CategoryBudgetLimitRepository categoryBudgetLimitRepository;

	@Mock
	private RecurringExpenseRepository recurringExpenseRepository;

	@InjectMocks
	private CategoryService categoryService;

	private Category existing;

	@BeforeEach
	void setUp() throws Exception {
		existing = new Category("Groceries", "Weekly shopping");
		setId(existing, 1L);
		setTimestamps(existing, Instant.parse("2026-01-01T00:00:00Z"), Instant.parse("2026-01-01T00:00:00Z"));
	}

	@Test
	void createValidCategory() {
		when(categoryRepository.existsByNameIgnoreCase("Groceries")).thenReturn(false);
		when(categoryRepository.saveAndFlush(any(Category.class))).thenAnswer(invocation -> {
			Category category = invocation.getArgument(0);
			setId(category, 10L);
			category.onCreate();
			return category;
		});

		CategoryResponse response = categoryService.create(new CategoryCreateRequest("Groceries", "Food"));

		assertThat(response.id()).isEqualTo(10L);
		assertThat(response.name()).isEqualTo("Groceries");
		assertThat(response.description()).isEqualTo("Food");
		assertThat(response.createdAt()).isNotNull();
		assertThat(response.updatedAt()).isNotNull();
	}

	@Test
	void createTrimsCategoryName() {
		when(categoryRepository.existsByNameIgnoreCase("Groceries")).thenReturn(false);
		when(categoryRepository.saveAndFlush(any(Category.class))).thenAnswer(invocation -> {
			Category category = invocation.getArgument(0);
			setId(category, 11L);
			category.onCreate();
			return category;
		});

		categoryService.create(new CategoryCreateRequest("  Groceries  ", "Food"));

		ArgumentCaptor<Category> captor = ArgumentCaptor.forClass(Category.class);
		verify(categoryRepository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getName()).isEqualTo("Groceries");
	}

	@Test
	void createConvertsBlankDescriptionToNull() {
		when(categoryRepository.existsByNameIgnoreCase("Groceries")).thenReturn(false);
		when(categoryRepository.saveAndFlush(any(Category.class))).thenAnswer(invocation -> {
			Category category = invocation.getArgument(0);
			setId(category, 12L);
			category.onCreate();
			return category;
		});

		CategoryResponse response = categoryService.create(new CategoryCreateRequest("Groceries", "   "));

		assertThat(response.description()).isNull();
	}

	@Test
	void createRejectsDuplicateName() {
		when(categoryRepository.existsByNameIgnoreCase("groceries")).thenReturn(true);

		assertThatThrownBy(() -> categoryService.create(new CategoryCreateRequest("groceries", null)))
			.isInstanceOf(CategoryNameAlreadyExistsException.class);

		verify(categoryRepository, never()).saveAndFlush(any());
	}

	@Test
	void createMapsIntegrityViolationToDuplicate() {
		when(categoryRepository.existsByNameIgnoreCase("Groceries")).thenReturn(false);
		when(categoryRepository.saveAndFlush(any(Category.class)))
			.thenThrow(new DataIntegrityViolationException("unique"));

		assertThatThrownBy(() -> categoryService.create(new CategoryCreateRequest("Groceries", null)))
			.isInstanceOf(CategoryNameAlreadyExistsException.class);
	}

	@Test
	void findByIdReturnsCategory() {
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));

		CategoryResponse response = categoryService.findById(1L);

		assertThat(response.id()).isEqualTo(1L);
		assertThat(response.name()).isEqualTo("Groceries");
	}

	@Test
	void findByIdThrowsWhenMissing() {
		when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> categoryService.findById(99L))
			.isInstanceOf(CategoryNotFoundException.class);
	}

	@Test
	void updateCategory() {
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));
		when(categoryRepository.existsByNameIgnoreCaseAndIdNot("Housing", 1L)).thenReturn(false);
		when(categoryRepository.saveAndFlush(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));

		CategoryResponse response = categoryService.update(1L, new CategoryUpdateRequest("Housing", "Rent"));

		assertThat(response.name()).isEqualTo("Housing");
		assertThat(response.description()).isEqualTo("Rent");
	}

	@Test
	void updateAllowsKeepingCurrentName() {
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));
		when(categoryRepository.existsByNameIgnoreCaseAndIdNot("Groceries", 1L)).thenReturn(false);
		when(categoryRepository.saveAndFlush(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));

		CategoryResponse response = categoryService.update(1L, new CategoryUpdateRequest("Groceries", "Updated"));

		assertThat(response.name()).isEqualTo("Groceries");
		assertThat(response.description()).isEqualTo("Updated");
	}

	@Test
	void updateRejectsDuplicateOfAnotherCategory() {
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));
		when(categoryRepository.existsByNameIgnoreCaseAndIdNot("Housing", 1L)).thenReturn(true);

		assertThatThrownBy(() -> categoryService.update(1L, new CategoryUpdateRequest("Housing", null)))
			.isInstanceOf(CategoryNameAlreadyExistsException.class);

		verify(categoryRepository, never()).saveAndFlush(any());
	}

	@Test
	void deleteExistingCategory() {
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));
		when(expenseRepository.existsByCategory_Id(1L)).thenReturn(false);
		when(categoryBudgetLimitRepository.existsByCategory_Id(1L)).thenReturn(false);
		when(recurringExpenseRepository.existsByCategory_Id(1L)).thenReturn(false);

		categoryService.delete(1L);

		verify(categoryRepository).delete(existing);
		verify(categoryRepository).flush();
	}

	@Test
	void deleteRejectsCategoryInUse() {
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));
		when(expenseRepository.existsByCategory_Id(1L)).thenReturn(true);

		assertThatThrownBy(() -> categoryService.delete(1L))
			.isInstanceOf(CategoryInUseException.class);

		verify(categoryRepository, never()).delete(any());
	}

	@Test
	void deleteRejectsCategoryWithBudgetLimit() {
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));
		when(expenseRepository.existsByCategory_Id(1L)).thenReturn(false);
		when(categoryBudgetLimitRepository.existsByCategory_Id(1L)).thenReturn(true);

		assertThatThrownBy(() -> categoryService.delete(1L))
			.isInstanceOf(CategoryInUseException.class);

		verify(categoryRepository, never()).delete(any());
	}

	@Test
	void deleteRejectsCategoryWithRecurringExpense() {
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));
		when(expenseRepository.existsByCategory_Id(1L)).thenReturn(false);
		when(categoryBudgetLimitRepository.existsByCategory_Id(1L)).thenReturn(false);
		when(recurringExpenseRepository.existsByCategory_Id(1L)).thenReturn(true);

		assertThatThrownBy(() -> categoryService.delete(1L))
			.isInstanceOf(CategoryInUseException.class);

		verify(categoryRepository, never()).delete(any());
	}

	@Test
	void deleteMapsIntegrityRaceToCategoryInUse() {
		when(categoryRepository.findById(1L)).thenReturn(Optional.of(existing));
		when(expenseRepository.existsByCategory_Id(1L)).thenReturn(false);
		when(categoryBudgetLimitRepository.existsByCategory_Id(1L)).thenReturn(false);
		when(recurringExpenseRepository.existsByCategory_Id(1L)).thenReturn(false);
		org.mockito.Mockito.doThrow(new DataIntegrityViolationException("fk"))
			.when(categoryRepository).delete(existing);

		assertThatThrownBy(() -> categoryService.delete(1L))
			.isInstanceOf(CategoryInUseException.class);
	}

	@Test
	void deleteMissingCategoryThrows() {
		when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> categoryService.delete(99L))
			.isInstanceOf(CategoryNotFoundException.class);
	}

	@Test
	void findAllReturnsAlphabeticalIgnoreCase() throws Exception {
		Category bills = new Category("bills", null);
		Category childcare = new Category("Childcare", null);
		Category groceries = new Category("groceries", null);
		Category housing = new Category("Housing", null);
		setId(bills, 1L);
		setId(childcare, 2L);
		setId(groceries, 3L);
		setId(housing, 4L);
		setTimestamps(bills, Instant.now(), Instant.now());
		setTimestamps(childcare, Instant.now(), Instant.now());
		setTimestamps(groceries, Instant.now(), Instant.now());
		setTimestamps(housing, Instant.now(), Instant.now());

		when(categoryRepository.findAllOrderByNameIgnoreCase())
			.thenReturn(List.of(bills, childcare, groceries, housing));

		List<CategoryResponse> response = categoryService.findAll();

		assertThat(response).extracting(CategoryResponse::name)
			.containsExactly("bills", "Childcare", "groceries", "Housing");
	}

	@Test
	void createRejectsBlankNormalizedName() {
		assertThatThrownBy(() -> categoryService.create(new CategoryCreateRequest("   ", null)))
			.isInstanceOf(InvalidCategoryDataException.class);
	}

	private static void setId(Category category, Long id) throws Exception {
		Field field = Category.class.getDeclaredField("id");
		field.setAccessible(true);
		field.set(category, id);
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
