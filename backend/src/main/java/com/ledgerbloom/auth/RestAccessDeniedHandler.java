package com.ledgerbloom.auth;

import com.ledgerbloom.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Returns a 403 JSON body for authenticated-but-not-permitted requests (and for CSRF
 * token failures, which Spring Security also routes through the AccessDeniedHandler).
 */
@Component
public class RestAccessDeniedHandler implements AccessDeniedHandler {

	private final ObjectMapper objectMapper;

	public RestAccessDeniedHandler(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	@Override
	public void handle(
			HttpServletRequest request,
			HttpServletResponse response,
			AccessDeniedException accessDeniedException) throws IOException {
		SecurityJsonErrorWriter.write(
			objectMapper,
			request,
			response,
			HttpStatus.FORBIDDEN,
			ErrorCode.FORBIDDEN,
			"Access to this resource is forbidden"
		);
	}
}
