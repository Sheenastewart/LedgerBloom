package com.ledgerbloom.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Logout is intentionally not defined here: it is handled entirely by
 * {@link SecurityConfig}'s logout DSL (session invalidation + cookie clearing), which
 * runs earlier in the filter chain than any controller.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;
	private final CurrentUser currentUser;

	public AuthController(AuthService authService, CurrentUser currentUser) {
		this.authService = authService;
		this.currentUser = currentUser;
	}

	@PostMapping("/register")
	@ResponseStatus(HttpStatus.CREATED)
	public UserResponse register(@Valid @RequestBody RegisterRequest request) {
		return authService.register(request);
	}

	@PostMapping("/login")
	public UserResponse login(
			@Valid @RequestBody LoginRequest request,
			HttpServletRequest httpRequest,
			HttpServletResponse httpResponse) {
		return authService.login(request, httpRequest, httpResponse);
	}

	@GetMapping("/me")
	public UserResponse me() {
		return authService.currentUser(currentUser.requireUserId());
	}
}
