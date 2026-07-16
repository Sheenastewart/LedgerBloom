package com.ledgerbloom.auth;

import com.ledgerbloom.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Returns a 401 JSON body (instead of the default redirect-to-login / WWW-Authenticate
 * challenge) whenever an unauthenticated request hits a protected route.
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

	private final ObjectMapper objectMapper;

	public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	@Override
	public void commence(
			HttpServletRequest request,
			HttpServletResponse response,
			AuthenticationException authException) throws IOException {
		SecurityJsonErrorWriter.write(
			objectMapper,
			request,
			response,
			HttpStatus.UNAUTHORIZED,
			ErrorCode.UNAUTHORIZED,
			"Authentication is required to access this resource"
		);
	}
}
