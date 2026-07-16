package com.ledgerbloom.account;

import com.ledgerbloom.auth.AuthenticationRequiredException;
import com.ledgerbloom.auth.AuthService;
import com.ledgerbloom.auth.InvalidPasswordChangeException;
import com.ledgerbloom.auth.PasswordPolicy;
import com.ledgerbloom.auth.PasswordResetTokenRepository;
import com.ledgerbloom.auth.UserResponse;
import com.ledgerbloom.user.User;
import com.ledgerbloom.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Account profile and password management for the authenticated session user.
 *
 * <p>Password-change session behavior: the current session remains authenticated after a
 * successful password change (the SecurityContext principal is refreshed with the new
 * password hash). Other browser sessions for the same user are not actively revoked by
 * this single-instance architecture; they continue until natural session timeout or
 * logout. Shared session revocation requires a distributed session store when the API
 * is horizontally scaled.
 */
@Service
@Transactional
public class AccountService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final AuthService authService;
	private final PasswordResetTokenRepository passwordResetTokenRepository;

	public AccountService(
			UserRepository userRepository,
			PasswordEncoder passwordEncoder,
			AuthService authService,
			PasswordResetTokenRepository passwordResetTokenRepository) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.authService = authService;
		this.passwordResetTokenRepository = passwordResetTokenRepository;
	}

	@Transactional(readOnly = true)
	public UserResponse getProfile(Long userId) {
		return authService.currentUser(userId);
	}

	public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
		User user = requireUser(userId);
		user.setDisplayName(normalizeDisplayName(request.displayName()));
		userRepository.saveAndFlush(user);
		return authService.currentUser(userId);
	}

	public UserResponse changePassword(
			Long userId,
			ChangePasswordRequest request,
			HttpServletRequest httpRequest,
			HttpServletResponse httpResponse) {
		User user = requireUser(userId);

		if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
			throw new InvalidPasswordChangeException("Unable to change password. Check your current password and try again.");
		}

		PasswordPolicy.validateNewPassword(request.newPassword(), request.confirmNewPassword());

		if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
			throw new InvalidPasswordChangeException("New password must be different from the current password");
		}

		user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
		userRepository.saveAndFlush(user);
		passwordResetTokenRepository.markAllUnusedAsUsedForUser(userId);

		// Refresh the current session principal so the new hash is authoritative for this session.
		authService.refreshAuthenticatedSession(user, httpRequest, httpResponse);
		touchSession(httpRequest);
		return authService.currentUser(userId);
	}

	private User requireUser(Long userId) {
		return userRepository.findById(userId)
			.orElseThrow(AuthenticationRequiredException::new);
	}

	private String normalizeDisplayName(String displayName) {
		String normalized = displayName == null ? "" : displayName.trim();
		if (normalized.isBlank()) {
			throw new InvalidAccountDataException("Display name is required");
		}
		if (normalized.length() > 120) {
			throw new InvalidAccountDataException("Display name must be at most 120 characters");
		}
		return normalized;
	}

	private void touchSession(HttpServletRequest httpRequest) {
		HttpSession session = httpRequest.getSession(false);
		if (session != null) {
			session.setAttribute("ledgerbloom.passwordChangedAt", java.time.Instant.now().toString());
		}
	}
}
