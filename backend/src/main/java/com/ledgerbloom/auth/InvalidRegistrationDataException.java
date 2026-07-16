package com.ledgerbloom.auth;

public class InvalidRegistrationDataException extends RuntimeException {

	public InvalidRegistrationDataException(String message) {
		super(message);
	}
}
