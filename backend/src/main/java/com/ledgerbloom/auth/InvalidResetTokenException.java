package com.ledgerbloom.auth;

public class InvalidResetTokenException extends RuntimeException {

	public InvalidResetTokenException() {
		super("This password reset link is invalid or has expired.");
	}
}
