package com.ledgerbloom.auth;

import com.ledgerbloom.user.User;
import com.ledgerbloom.user.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Reads the authenticated user out of the SecurityContext so services never need to
 * touch Spring Security types directly. Every mutating or read service method for
 * user-owned data should resolve the id via {@link #requireUserId()} before querying.
 */
@Component
public class CurrentUser {

	private final UserRepository userRepository;

	public CurrentUser(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	public Long requireUserId() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !authentication.isAuthenticated()) {
			throw new AuthenticationRequiredException();
		}
		Object principal = authentication.getPrincipal();
		if (principal instanceof SecurityUserDetails userDetails) {
			return userDetails.getUserId();
		}
		throw new AuthenticationRequiredException();
	}

	public User requireUser() {
		return userRepository.findById(requireUserId())
			.orElseThrow(AuthenticationRequiredException::new);
	}

	/**
	 * Returns a lazy JPA reference to the current user, suitable for setting the
	 * owning side of a ManyToOne association without an extra SELECT.
	 */
	public User requireUserReference() {
		return userRepository.getReferenceById(requireUserId());
	}
}
