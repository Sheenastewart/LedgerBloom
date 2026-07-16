package com.ledgerbloom.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
		@NotBlank(message = "Current password is required")
		String currentPassword,

		@NotBlank(message = "New password is required")
		@Size(min = 12, max = 100, message = "Password must be at least 12 characters")
		String newPassword,

		@NotBlank(message = "Confirm password is required")
		String confirmNewPassword
) {
}
