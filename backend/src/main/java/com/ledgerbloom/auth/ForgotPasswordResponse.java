package com.ledgerbloom.auth;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ForgotPasswordResponse(String message, String devResetToken) {

	public static final String GENERIC_MESSAGE =
		"If an account exists for that email, password reset instructions have been sent.";

	public static ForgotPasswordResponse generic() {
		return new ForgotPasswordResponse(GENERIC_MESSAGE, null);
	}

	public static ForgotPasswordResponse withDevToken(String token) {
		return new ForgotPasswordResponse(GENERIC_MESSAGE, token);
	}
}
