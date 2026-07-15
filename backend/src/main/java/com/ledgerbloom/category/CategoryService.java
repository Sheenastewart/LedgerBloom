package com.ledgerbloom.category;

import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CategoryService {

	private final CategoryRepository categoryRepository;

	public CategoryService(CategoryRepository categoryRepository) {
		this.categoryRepository = categoryRepository;
	}

	@Transactional(readOnly = true)
	public List<CategoryResponse> findAll() {
		return categoryRepository.findAllOrderByNameIgnoreCase().stream()
			.map(this::toResponse)
			.toList();
	}

	@Transactional(readOnly = true)
	public CategoryResponse findById(Long id) {
		return toResponse(getCategoryOrThrow(id));
	}

	public CategoryResponse create(CategoryCreateRequest request) {
		String name = normalizeRequiredName(request.name());
		String description = normalizeDescription(request.description());
		ensureNameAvailable(name, null);

		Category category = new Category(name, description);
		return toResponse(saveCategory(category, name));
	}

	public CategoryResponse update(Long id, CategoryUpdateRequest request) {
		Category category = getCategoryOrThrow(id);
		String name = normalizeRequiredName(request.name());
		String description = normalizeDescription(request.description());
		ensureNameAvailable(name, id);

		category.setName(name);
		category.setDescription(description);
		return toResponse(saveCategory(category, name));
	}

	public void delete(Long id) {
		Category category = getCategoryOrThrow(id);
		categoryRepository.delete(category);
		// Deletion does not check "category in use" yet. That rule is deferred until
		// Expense relationships and foreign-key restrictions exist.
	}

	private Category getCategoryOrThrow(Long id) {
		return categoryRepository.findById(id)
			.orElseThrow(() -> new CategoryNotFoundException(id));
	}

	private void ensureNameAvailable(String name, Long currentId) {
		boolean duplicate = currentId == null
			? categoryRepository.existsByNameIgnoreCase(name)
			: categoryRepository.existsByNameIgnoreCaseAndIdNot(name, currentId);
		if (duplicate) {
			throw new CategoryNameAlreadyExistsException(name);
		}
	}

	/**
	 * Persists a category after application-level duplicate checks. Integrity
	 * exceptions from this save are treated as the race on ux_categories_name_lower.
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
