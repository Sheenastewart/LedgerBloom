package com.ledgerbloom.category;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.budget.CategoryBudgetLimitRepository;
import com.ledgerbloom.expense.ExpenseRepository;
import com.ledgerbloom.recurring.RecurringExpenseRepository;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CategoryService {

	private final CategoryRepository categoryRepository;
	private final ExpenseRepository expenseRepository;
	private final CategoryBudgetLimitRepository categoryBudgetLimitRepository;
	private final RecurringExpenseRepository recurringExpenseRepository;
	private final CurrentUser currentUser;

	public CategoryService(
			CategoryRepository categoryRepository,
			ExpenseRepository expenseRepository,
			CategoryBudgetLimitRepository categoryBudgetLimitRepository,
			RecurringExpenseRepository recurringExpenseRepository,
			CurrentUser currentUser) {
		this.categoryRepository = categoryRepository;
		this.expenseRepository = expenseRepository;
		this.categoryBudgetLimitRepository = categoryBudgetLimitRepository;
		this.recurringExpenseRepository = recurringExpenseRepository;
		this.currentUser = currentUser;
	}

	@Transactional(readOnly = true)
	public List<CategoryResponse> findAll() {
		Long userId = currentUser.requireUserId();
		return categoryRepository.findByUser_IdOrderByNameIgnoreCase(userId).stream()
			.map(this::toResponse)
			.toList();
	}

	@Transactional(readOnly = true)
	public CategoryResponse findById(Long id) {
		return toResponse(getCategoryOrThrow(id, currentUser.requireUserId()));
	}

	public CategoryResponse create(CategoryCreateRequest request) {
		Long userId = currentUser.requireUserId();
		String name = normalizeRequiredName(request.name());
		String description = normalizeDescription(request.description());
		ensureNameAvailable(userId, name, null);

		Category category = new Category(currentUser.requireUserReference(), name, description);
		return toResponse(saveCategory(category, name));
	}

	public CategoryResponse update(Long id, CategoryUpdateRequest request) {
		Long userId = currentUser.requireUserId();
		Category category = getCategoryOrThrow(id, userId);
		String name = normalizeRequiredName(request.name());
		String description = normalizeDescription(request.description());
		ensureNameAvailable(userId, name, id);

		category.setName(name);
		category.setDescription(description);
		return toResponse(saveCategory(category, name));
	}

	public void delete(Long id) {
		Category category = getCategoryOrThrow(id, currentUser.requireUserId());
		if (expenseRepository.existsByCategory_Id(id)
				|| categoryBudgetLimitRepository.existsByCategory_Id(id)
				|| recurringExpenseRepository.existsByCategory_Id(id)) {
			throw new CategoryInUseException(id);
		}
		try {
			categoryRepository.delete(category);
			categoryRepository.flush();
		}
		catch (DataIntegrityViolationException ex) {
			throw new CategoryInUseException(id);
		}
	}

	private Category getCategoryOrThrow(Long id, Long userId) {
		return categoryRepository.findByIdAndUser_Id(id, userId)
			.orElseThrow(() -> new CategoryNotFoundException(id));
	}

	private void ensureNameAvailable(Long userId, String name, Long currentId) {
		boolean duplicate = currentId == null
			? categoryRepository.existsByUser_IdAndNameIgnoreCase(userId, name)
			: categoryRepository.existsByUser_IdAndNameIgnoreCaseAndIdNot(userId, name, currentId);
		if (duplicate) {
			throw new CategoryNameAlreadyExistsException(name);
		}
	}

	/**
	 * Persists a category after application-level duplicate checks. Integrity
	 * exceptions from this save are treated as the race on ux_categories_user_id_name_lower.
	 */
	private Category saveCategory(Category category, String normalizedName) {
		try {
			return categoryRepository.saveAndFlush(category);
		}
		catch (DataIntegrityViolationException ex) {
			throw new CategoryNameAlreadyExistsException(normalizedName);
		}
	}

	private String normalizeRequiredName(String name) {
		String normalized = name == null ? "" : name.trim();
		if (normalized.isBlank()) {
			throw new InvalidCategoryDataException("Name is required");
		}
		if (normalized.length() > 80) {
			throw new InvalidCategoryDataException("Name must be at most 80 characters");
		}
		return normalized;
	}

	private String normalizeDescription(String description) {
		if (description == null) {
			return null;
		}
		String normalized = description.trim();
		if (normalized.isBlank()) {
			return null;
		}
		if (normalized.length() > 255) {
			throw new InvalidCategoryDataException("Description must be at most 255 characters");
		}
		return normalized;
	}

	private CategoryResponse toResponse(Category category) {
		return new CategoryResponse(
			category.getId(),
			category.getName(),
			category.getDescription(),
			category.getCreatedAt(),
			category.getUpdatedAt()
		);
	}
}
