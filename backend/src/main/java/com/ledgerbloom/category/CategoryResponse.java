package com.ledgerbloom.category;

public record CategoryResponse(
		Long id,
		String name,
		String description,
		String color,
		String budgetGroup,
		String budgetGroupLabel,
		java.time.Instant createdAt,
		java.time.Instant updatedAt
) {
}
