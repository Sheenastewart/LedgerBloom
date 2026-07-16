package com.ledgerbloom.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
		@NotBlank(message = "Reset token is required")
		String token,

		@NotBlank(message = "New password is required")
		@Size(min = 12, max = 100, message = "Password must be at least 12 characters")
		String newPassword,

		@NotBlank(message = "Confirm password is required")
		String confirmNewPassword
) {
}
