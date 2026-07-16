package com.ledgerbloom.auth;

/**
 * Deliberately carries no detail about whether the email or password was wrong,
 * so the API never reveals which part of the credential pair was incorrect.
 */
public class InvalidCredentialsException extends RuntimeException {

	public InvalidCredentialsException() {
		super("Invalid email or password");
	}
}
