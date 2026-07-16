package com.ledgerbloom.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
		@NotBlank(message = "Email is required")
		@Email(message = "Email must be a valid email address")
		@Size(max = 320, message = "Email must be at most 320 characters")
		String email,

		@NotBlank(message = "Password is required")
		@Size(min = 12, max = 100, message = "Password must be at least 12 characters")
		String password,

		@NotBlank(message = "Confirm password is required")
		String confirmPassword,

		@NotBlank(message = "Display name is required")
		@Size(max = 120, message = "Display name must be at most 120 characters")
		String displayName
) {
}
