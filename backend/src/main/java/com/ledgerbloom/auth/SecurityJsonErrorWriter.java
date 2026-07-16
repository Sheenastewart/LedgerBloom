package com.ledgerbloom.auth;

import com.ledgerbloom.error.ApiErrorResponse;
import com.ledgerbloom.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import tools.jackson.databind.ObjectMapper;

/**
 * Writes {@link ApiErrorResponse} JSON bodies from security components (entry point,
 * access denied handler) that run before the DispatcherServlet, so they cannot rely on
 * GlobalExceptionHandler's @RestControllerAdvice.
 */
final class SecurityJsonErrorWriter {

	private SecurityJsonErrorWriter() {
	}

	static void write(
			ObjectMapper objectMapper,
			HttpServletRequest request,
			HttpServletResponse response,
			HttpStatus status,
			ErrorCode code,
			String message) throws IOException {
		ApiErrorResponse body = new ApiErrorResponse(
			Instant.now(),
			status.value(),
			status.getReasonPhrase(),
			code.name(),
			message,
			request.getRequestURI(),
			null
		);
		response.setStatus(status.value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		objectMapper.writeValue(response.getWriter(), body);
	}
}
