package com.ledgerbloom.category;

import com.ledgerbloom.auth.CurrentUser;
import com.ledgerbloom.budget.BudgetGroup;
import com.ledgerbloom.expense.ExpenseRepository;
import com.ledgerbloom.recurring.RecurringExpenseRepository;
import com.ledgerbloom.user.User;
import java.util.ArrayList;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CategoryService {

	private final CategoryRepository categoryRepository;
	private final ExpenseRepository expenseRepository;
	private final RecurringExpenseRepository recurringExpenseRepository;
	private final CurrentUser currentUser;

	public CategoryService(
			CategoryRepository categoryRepository,
			ExpenseRepository expenseRepository,
			RecurringExpenseRepository recurringExpenseRepository,
			CurrentUser currentUser) {
		this.categoryRepository = categoryRepository;
		this.expenseRepository = expenseRepository;
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
		String color = normalizeColor(request.color());
		BudgetGroup budgetGroup = requireBudgetGroup(request.budgetGroup(), name);
		ensureNameAvailable(userId, name, null);

		Category category = new Category(currentUser.requireUserReference(), name, description, budgetGroup);
		category.setColor(color);
		return toResponse(saveCategory(category, name));
	}

	public CategoryResponse update(Long id, CategoryUpdateRequest request) {
		Long userId = currentUser.requireUserId();
		Category category = getCategoryOrThrow(id, userId);
		String name = normalizeRequiredName(request.name());
		String description = normalizeDescription(request.description());
		String color = normalizeColor(request.color());
		BudgetGroup budgetGroup = requireBudgetGroup(request.budgetGroup(), name);
		ensureNameAvailable(userId, name, id);

		category.setName(name);
		category.setDescription(description);
		category.setColor(color);
		category.setBudgetGroup(budgetGroup);
		return toResponse(saveCategory(category, name));
	}

	public StarterCategoriesResponse addStarterSet() {
		return createStarterSetForUser(currentUser.requireUserReference());
	}

	/**
	 * Creates user-owned starter categories that do not already exist for the account.
	 * Name matching is case-insensitive so user-created or renamed categories are preserved.
	 */
	public StarterCategoriesResponse createStarterSetForUser(User user) {
		Long userId = user.getId();
		List<String> createdNames = new ArrayList<>();
		List<String> skippedNames = new ArrayList<>();

		for (String name : StarterCategoryNames.ALL) {
			if (categoryRepository.existsByUser_IdAndNameIgnoreCase(userId, name)) {
				skippedNames.add(name);
				continue;
			}
			Category category = new Category(user, name, null, BudgetGroup.fromCategoryName(name));
			saveCategory(category, name);
			createdNames.add(name);
		}

		return new StarterCategoriesResponse(
			createdNames.size(),
			List.copyOf(createdNames),
			skippedNames.size(),
			List.copyOf(skippedNames)
		);
	}

	public void delete(Long id) {
		Category category = getCategoryOrThrow(id, currentUser.requireUserId());
		if (expenseRepository.existsByCategory_Id(id)
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

	private Category saveCategory(Category category, String normalizedName) {
		try {
			return categoryRepository.saveAndFlush(category);
		}
		catch (DataIntegrityViolationException ex) {
			throw new CategoryNameAlreadyExistsException(normalizedName);
		}
	}

	private BudgetGroup requireBudgetGroup(String raw, String categoryName) {
		if (raw == null || raw.isBlank()) {
			return BudgetGroup.fromCategoryName(categoryName);
		}
		return BudgetGroup.tryParse(raw).orElseThrow(() ->
			new InvalidCategoryDataException("Budget group is required and must be a valid budget bucket")
		);
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

	private String normalizeColor(String color) {
		if (color == null) {
			return null;
		}
		String normalized = color.trim();
		if (normalized.isBlank()) {
			return null;
		}
		if (!normalized.matches("^#[0-9A-Fa-f]{6}$")) {
			throw new InvalidCategoryDataException("Color must be a #RRGGBB hex value");
		}
		return normalized.toUpperCase();
	}

	private CategoryResponse toResponse(Category category) {
		BudgetGroup group = category.getBudgetGroup() != null
			? category.getBudgetGroup()
			: BudgetGroup.fromCategoryName(category.getName());
		return new CategoryResponse(
			category.getId(),
			category.getName(),
			category.getDescription(),
			category.getColor(),
			group.name(),
			group.getLabel(),
			category.getCreatedAt(),
			category.getUpdatedAt()
		);
	}
}
