package com.ledgerbloom.auth;

/**
 * Defensive guard thrown by {@link CurrentUser} when a service method somehow executes
 * without an authenticated principal in the SecurityContext. Under normal operation the
 * SecurityFilterChain rejects anonymous requests to protected routes before controllers
 * (and therefore services) ever run.
 */
public class AuthenticationRequiredException extends RuntimeException {

	public AuthenticationRequiredException() {
		super("Authentication is required to perform this action");
	}
}
