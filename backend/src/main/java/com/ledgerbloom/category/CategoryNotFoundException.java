package com.ledgerbloom.category;

public class CategoryNotFoundException extends RuntimeException {

	public CategoryNotFoundException(Long id) {
		super("Category not found: " + id);
	}
}
