package com.ledgerbloom.report;

public class ExportGenerationFailedException extends RuntimeException {

	public ExportGenerationFailedException(String message) {
		super(message);
	}

	public ExportGenerationFailedException(String message, Throwable cause) {
		super(message, cause);
	}
}
