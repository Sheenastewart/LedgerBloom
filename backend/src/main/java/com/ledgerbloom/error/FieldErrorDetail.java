package com.ledgerbloom.error;

public record FieldErrorDetail(
		String field,
		String message
) {
}
