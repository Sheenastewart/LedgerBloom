package com.ledgerbloom.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
		@NotBlank(message = "Display name is required")
		@Size(max = 120, message = "Display name must be at most 120 characters")
		String displayName
) {
}
