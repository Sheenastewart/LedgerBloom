package com.ledgerbloom.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CategoryUpdateRequest(
		@NotBlank(message = "Name is required")
		@Size(max = 80, message = "Name must be at most 80 characters")
		String name,

		@Size(max = 255, message = "Description must be at most 255 characters")
		String description,

		@Pattern(regexp = "^$|^#[0-9A-Fa-f]{6}$", message = "Color must be a #RRGGBB hex value")
		@Size(max = 7, message = "Color must be at most 7 characters")
		String color,

		@NotBlank(message = "Budget group is required")
		String budgetGroup
) {
}
