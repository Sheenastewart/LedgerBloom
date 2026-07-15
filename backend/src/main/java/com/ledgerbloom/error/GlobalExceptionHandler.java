package com.ledgerbloom.error;

import com.ledgerbloom.category.CategoryNameAlreadyExistsException;
import com.ledgerbloom.category.CategoryNotFoundException;
import com.ledgerbloom.category.InvalidCategoryDataException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(CategoryNotFoundException.class)
	public ResponseEntity<ApiErrorResponse> handleNotFound(
			CategoryNotFoundException ex,
			HttpServletRequest request) {
		return build(HttpStatus.NOT_FOUND, ErrorCode.CATEGORY_NOT_FOUND, ex.getMessage(), request.getRequestURI(), null);
	}

	@ExceptionHandler(CategoryNameAlreadyExistsException.class)
	public ResponseEntity<ApiErrorResponse> handleConflict(
			CategoryNameAlreadyExistsException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.CONFLICT,
			ErrorCode.CATEGORY_NAME_ALREADY_EXISTS,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(InvalidCategoryDataException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidCategoryData(
			InvalidCategoryDataException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.VALIDATION_FAILED,
			ex.getMessage(),
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiErrorResponse> handleValidation(
			MethodArgumentNotValidException ex,
			HttpServletRequest request) {
		List<FieldErrorDetail> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
			.map(this::toFieldError)
			.toList();
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.VALIDATION_FAILED,
			"Request validation failed",
			request.getRequestURI(),
			fieldErrors
		);
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ApiErrorResponse> handleUnreadable(
			HttpMessageNotReadableException ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.BAD_REQUEST,
			ErrorCode.INVALID_REQUEST,
			"Malformed request body",
			request.getRequestURI(),
			null
		);
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiErrorResponse> handleUnexpected(
			Exception ex,
			HttpServletRequest request) {
		return build(
			HttpStatus.INTERNAL_SERVER_ERROR,
			ErrorCode.INTERNAL_SERVER_ERROR,
			"An unexpected error occurred",
			request.getRequestURI(),
			null
		);
	}

	private FieldErrorDetail toFieldError(FieldError fieldError) {
		return new FieldErrorDetail(fieldError.getField(), fieldError.getDefaultMessage());
	}

	private ResponseEntity<ApiErrorResponse> build(
			HttpStatus status,
			ErrorCode code,
			String message,
			String path,
			List<FieldErrorDetail> fieldErrors) {
		ApiErrorResponse body = new ApiErrorResponse(
			Instant.now(),
			status.value(),
			status.getReasonPhrase(),
			code.name(),
			message,
			path,
			fieldErrors
		);
		return ResponseEntity.status(status).body(body);
	}
}
