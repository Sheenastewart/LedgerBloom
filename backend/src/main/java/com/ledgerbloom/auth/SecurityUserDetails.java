package com.ledgerbloom.auth;

import com.ledgerbloom.user.User;
import java.io.Serializable;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Wraps the domain {@link User} as the Spring Security principal. The username is the
 * user's email (lowercase, unique). Implements Serializable so it can be persisted as
 * part of the HTTP session when the SecurityContext is stored server-side.
 */
public class SecurityUserDetails implements UserDetails, Serializable {

	private final Long userId;
	private final String email;
	private final String passwordHash;
	private final String displayName;

	public SecurityUserDetails(User user) {
		this.userId = user.getId();
		this.email = user.getEmail();
		this.passwordHash = user.getPasswordHash();
		this.displayName = user.getDisplayName();
	}

	public Long getUserId() {
		return userId;
	}

	public String getDisplayName() {
		return displayName;
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return List.of(new SimpleGrantedAuthority("ROLE_USER"));
	}

	@Override
	public String getPassword() {
		return passwordHash;
	}

	@Override
	public String getUsername() {
		return email;
	}
}
