package com.ledgerbloom.auth;

public class InvalidPasswordChangeException extends RuntimeException {

	public InvalidPasswordChangeException(String message) {
		super(message);
	}
}
