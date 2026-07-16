package com.ledgerbloom.auth;

public class EmailAlreadyExistsException extends RuntimeException {

	public EmailAlreadyExistsException(String email) {
		super("An account with email '" + email + "' already exists");
	}
}
