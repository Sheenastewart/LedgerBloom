package com.ledgerbloom.auth;

import com.ledgerbloom.category.CategoryService;
import com.ledgerbloom.user.User;
import com.ledgerbloom.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Instant;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthService {

	private final UserRepository userRepository;
	private final CategoryService categoryService;
	private final PasswordEncoder passwordEncoder;
	private final SecurityContextRepository securityContextRepository;
	private final LoginAttemptService loginAttemptService;

	public AuthService(
			UserRepository userRepository,
			CategoryService categoryService,
			PasswordEncoder passwordEncoder,
			SecurityContextRepository securityContextRepository,
			LoginAttemptService loginAttemptService) {
		this.userRepository = userRepository;
		this.categoryService = categoryService;
		this.passwordEncoder = passwordEncoder;
		this.securityContextRepository = securityContextRepository;
		this.loginAttemptService = loginAttemptService;
	}

	public UserResponse register(RegisterRequest request) {
		String email = normalizeEmail(request.email());
		String displayName = normalizeDisplayName(request.displayName());
		try {
			PasswordPolicy.validateNewPassword(request.password(), request.confirmPassword());
		}
		catch (InvalidPasswordChangeException ex) {
			throw new InvalidRegistrationDataException(ex.getMessage());
		}

		if (userRepository.existsByEmailIgnoreCase(email)) {
			throw new EmailAlreadyExistsException(email);
		}

		User user = new User(email, passwordEncoder.encode(request.password()), displayName);
		try {
			user = userRepository.saveAndFlush(user);
		}
		catch (DataIntegrityViolationException ex) {
			throw new EmailAlreadyExistsException(email);
		}
		categoryService.createStarterSetForUser(user);
		return toResponse(user);
	}

	public UserResponse login(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
		String email = normalizeEmail(request.email());
		String clientAddress = clientAddress(httpRequest);
		loginAttemptService.assertNotThrottled(email, clientAddress);

		User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
		if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
			loginAttemptService.recordFailure(email, clientAddress);
			throw new InvalidCredentialsException();
		}

		loginAttemptService.clear(email, clientAddress);
		user.setLastLoginAt(Instant.now());
		userRepository.saveAndFlush(user);

		authenticateSession(user, httpRequest, httpResponse);
		return toResponse(user);
	}

	@Transactional(readOnly = true)
	public UserResponse currentUser(Long userId) {
		User user = userRepository.findById(userId)
			.orElseThrow(AuthenticationRequiredException::new);
		return toResponse(user);
	}

	/**
	 * Refreshes the authenticated SecurityContext for the current HTTP session after a
	 * password change so the principal carries the updated password hash.
	 */
	public void refreshAuthenticatedSession(User user, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
		authenticateSession(user, httpRequest, httpResponse);
	}

	/**
	 * Manually builds and persists the SecurityContext instead of delegating to an
	 * AuthenticationManager/DaoAuthenticationProvider bean: the password check already
	 * happened above via the same UserRepository + PasswordEncoder this service already
	 * needs for registration, so a second authentication round-trip would be redundant.
	 */
	private void authenticateSession(User user, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
		SecurityUserDetails principal = new SecurityUserDetails(user);
		Authentication authentication =
			new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(authentication);
		SecurityContextHolder.setContext(context);
		securityContextRepository.saveContext(context, httpRequest, httpResponse);
	}

	private String clientAddress(HttpServletRequest request) {
		if (request == null) {
			return "unknown";
		}
		String forwarded = request.getHeader("X-Forwarded-For");
		if (forwarded != null && !forwarded.isBlank()) {
			return forwarded.split(",")[0].trim();
		}
		String remote = request.getRemoteAddr();
		return remote == null || remote.isBlank() ? "unknown" : remote;
	}

	private String normalizeEmail(String email) {
		String normalized = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
		if (normalized.isBlank()) {
			throw new InvalidRegistrationDataException("Email is required");
		}
		return normalized;
	}

	private String normalizeDisplayName(String displayName) {
		String normalized = displayName == null ? "" : displayName.trim();
		if (normalized.isBlank()) {
			throw new InvalidRegistrationDataException("Display name is required");
		}
		if (normalized.length() > 120) {
			throw new InvalidRegistrationDataException("Display name must be at most 120 characters");
		}
		return normalized;
	}

	private UserResponse toResponse(User user) {
		return new UserResponse(
			user.getId(),
			user.getEmail(),
			user.getDisplayName(),
			user.getCreatedAt(),
			user.getLastLoginAt()
		);
	}
}
