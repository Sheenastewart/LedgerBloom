package com.ledgerbloom.auth;

/**
 * Shared password policy for registration, password change, and password reset.
 */
public final class PasswordPolicy {

	public static final int MIN_LENGTH = 12;
	public static final int MAX_LENGTH = 100;

	private PasswordPolicy() {
	}

	public static void validateNewPassword(String password, String confirmPassword) {
		if (password == null || password.isBlank()) {
			throw new InvalidPasswordChangeException("New password is required");
		}
		if (password.length() < MIN_LENGTH) {
			throw new InvalidPasswordChangeException(
				"Password must be at least " + MIN_LENGTH + " characters"
			);
		}
		if (password.length() > MAX_LENGTH) {
			throw new InvalidPasswordChangeException(
				"Password must be at most " + MAX_LENGTH + " characters"
			);
		}
		if (confirmPassword == null || !password.equals(confirmPassword)) {
			throw new InvalidPasswordChangeException("Password and confirm password must match");
		}
	}
}
