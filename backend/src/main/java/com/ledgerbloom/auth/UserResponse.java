package com.ledgerbloom.auth;

import java.time.Instant;

/**
 * Shared response shape for register, login, and /api/auth/me. Intentionally omits
 * the password hash; never add it here.
 */
public record UserResponse(
		Long id,
		String email,
		String displayName,
		Instant createdAt,
		Instant lastLoginAt
) {
}
