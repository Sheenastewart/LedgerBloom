package com.ledgerbloom.auth;

public class LoginThrottledException extends RuntimeException {

	public LoginThrottledException() {
		super("Too many failed sign-in attempts. Please try again later.");
	}
}
